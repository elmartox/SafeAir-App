#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <time.h>

// -------------------- WiFi --------------------
#define WIFI_SSID "Hola"
#define WIFI_PASSWORD "hola1235"

// -------------------- Backend -----------------
#define DATA_URL    "http://3.145.133.233:3000/api/air-data"
#define CONTROL_URL "http://3.145.133.233:3000/api/air-control"

// -------------------- Pines -------------------
#define MQ2_PIN 34
#define LED_VERDE 25
#define LED_AMARILLO 26
#define LED_ROJO 27
#define BUZZER_PIN 14
#define RELAY_PIN 32
#define SERVO_PIN 33

// -------------------- Umbrales GLP (ppm) ------
#define NORMAL_MAX 120
#define PELIGRO_MIN 300

// -------------------- MQ-2 --------------------
#define RL 5.0      // kΩ
#define R0 10.0     // kΩ (valor base)

// -------------------- Objetos -----------------
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo servoVentana;

// -------------------- NTP ---------------------
#define NTP_SERVER "pool.ntp.org"
#define GMT_OFFSET_SEC -18000

// -------------------- Estados -----------------
enum EstadoSistema { NORMAL, ALERTA, PELIGRO };
EstadoSistema estadoActual = NORMAL;

bool modoManual = false;
int mq2Value = 0;
float glpPPM = 0;
bool esGLP = false;

// -------------------- Hora --------------------
String obtenerFechaHora() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "SIN_HORA";
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

// ================== MQ-2 FUNCIONES ==================
// Calcula la resistencia Rs del sensor MQ-2 a partir del valor ADC.
// Esta resistencia es necesaria para calcular la relación Rs/R0,
// usada para estimar la concentración de gas.
float calcularRs(int adc) {
  if (adc <= 0) adc = 1;
  return RL * (4095.0 - adc) / adc;
}
// Determina si el gas detectado corresponde a GLP
// usando el rango típico de la relación Rs/R0 según el datasheet.
// Retorna true si el gas es probable GLP.
bool discriminarGLP(float ratio) {
  return (ratio >= 0.4 && ratio <= 2.2);
}

//// Calcula la concentración de GLP en ppm usando la curva
// característica del sensor MQ-2 obtenida del datasheet.
float calcularGLPppm(float ratio) {
  return 574.25 * pow(ratio, -2.222);
}

// ================== BACKEND ==================

void enviarEstado(String estadoSistema) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(DATA_URL);
  http.addHeader("Content-Type", "application/json");

  String estadoAlarma = (estadoSistema == "PELIGRO") ? "ON" : "OFF";
  String estadoVentana = (estadoSistema == "NORMAL") ? "CERRADA" :
                         (estadoSistema == "ALERTA") ? "MEDIA" : "ABIERTA";

  String jsonData =
    "{"
      "\"fecha_hora\":\"" + obtenerFechaHora() + "\","
      "\"habitacion\":\"Cocina\","
"\"sensores\":{"
  "\"nivel_gas\":" + String(glpPPM) + ","
  "\"mq2\":" + String(mq2Value) +
"},"
      "\"controles\":{"
        "\"estado_sistema\":\"" + estadoSistema + "\","
        "\"estado_alarma\":\"" + estadoAlarma + "\","
        "\"estado_ventana\":\"" + estadoVentana + "\""
      "}"
    "}";

  http.POST(jsonData);
  http.end();
}

//controles de la aplicación

void leerControles() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(CONTROL_URL);
  if (http.GET() != 200) {
    http.end();
    return;
  }
// Lee los controles enviados desde la aplicación móvil o web.
// Permite controlar manualmente ventana, ventilador y alarma.
// El modo manual se ignora si el sistema está en estado PELIGRO.
  StaticJsonDocument<256> doc;
  deserializeJson(doc, http.getString());
  http.end();

  modoManual = doc["modo_manual"];
  if (!modoManual || estadoActual == PELIGRO) return;

  String ventana = doc["ventana"];
  if (ventana == "ABIERTA") servoVentana.write(180);
  else if (ventana == "MEDIA") servoVentana.write(60);
  else servoVentana.write(0);

  digitalWrite(RELAY_PIN, doc["ventilador"] == "ON" ? HIGH : LOW);
  digitalWrite(BUZZER_PIN, doc["alarma"] == "ON" ? HIGH : LOW);
}

// definicion de estados

void estadoNormal() {
  digitalWrite(LED_VERDE, HIGH);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(RELAY_PIN, LOW);
  servoVentana.write(0);
}

void estadoAlerta() {
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, HIGH);
  digitalWrite(LED_ROJO, LOW);
  digitalWrite(RELAY_PIN, HIGH);
  servoVentana.write(60);
}

void estadoPeligro() {
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  digitalWrite(RELAY_PIN, HIGH);
  servoVentana.write(180);
}

void ledsNormal() {
  digitalWrite(LED_VERDE, HIGH);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);
}

void ledsAlerta() {
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, HIGH);
  digitalWrite(LED_ROJO, LOW);
}

// ================== SETUP ==================

void setup() {
  Serial.begin(115200);

  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);

  servoVentana.attach(SERVO_PIN);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.print("Iniciando...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  configTime(GMT_OFFSET_SEC, 0, NTP_SERVER);
  lcd.clear();
}


// ================== LOOP ==================

void loop() {

  int suma = 0;
  for (int i = 0; i < 10; i++) {
    suma += analogRead(MQ2_PIN);
    delay(5);
  }
  mq2Value = suma / 10;

  float Rs = calcularRs(mq2Value);
  float ratio = Rs / R0;

  esGLP = discriminarGLP(ratio);

  if (esGLP) {
    glpPPM = calcularGLPppm(ratio);
  } else {
    glpPPM = 0;
  }

  lcd.setCursor(0, 0);
  lcd.print(esGLP ? "GLP: " : "NO GLP ");
  lcd.print(glpPPM);
  lcd.print("ppm ");

  if (!esGLP || glpPPM < NORMAL_MAX) estadoActual = NORMAL;
  else if (glpPPM < PELIGRO_MIN) estadoActual = ALERTA;
  else estadoActual = PELIGRO;

  leerControles();

  if (estadoActual == PELIGRO) {
    estadoPeligro();
    lcd.setCursor(0, 1);
    lcd.print("PELIGRO GAS!!! ");
  }
  else if (modoManual) {
    if (estadoActual == NORMAL) ledsNormal();
    else ledsAlerta();
    lcd.setCursor(0, 1);
    lcd.print("MODO MANUAL   ");
  }
  else {
    if (estadoActual == NORMAL) {
      estadoNormal();
      lcd.setCursor(0, 1);
      lcd.print("ESTADO NORMAL ");
    } else {
      estadoAlerta();
      lcd.setCursor(0, 1);
      lcd.print("ESTADO ALERTA ");
    }
  }

  // Solo enviar datos si realmente es GLP
  if (esGLP) {
    enviarEstado(
      estadoActual == NORMAL ? "NORMAL" :
      estadoActual == ALERTA ? "ALERTA" : "PELIGRO"
    );
  }

  delay(500);
}
