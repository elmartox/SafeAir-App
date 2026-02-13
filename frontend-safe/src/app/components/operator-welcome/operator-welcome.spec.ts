import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatorWelcome } from './operator-welcome';

describe('OperatorWelcome', () => {
  let component: OperatorWelcome;
  let fixture: ComponentFixture<OperatorWelcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatorWelcome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperatorWelcome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
