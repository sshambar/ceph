import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { ToastrModule } from 'ngx-toastr';

import { configureTestBed } from '../../../../../testing/unit-test-helper';
import { OrchestratorService } from '../../../../shared/api/orchestrator.service';
import { TableActionsComponent } from '../../../../shared/datatable/table-actions/table-actions.component';
import { CdTableAction } from '../../../../shared/models/cd-table-action';
import { CdTableSelection } from '../../../../shared/models/cd-table-selection';
import { OrchestratorFeature } from '../../../../shared/models/orchestrator.enum';
import { Permissions } from '../../../../shared/models/permissions';
import { AuthStorageService } from '../../../../shared/services/auth-storage.service';
import { SharedModule } from '../../../../shared/shared.module';
import { InventoryDevicesComponent } from './inventory-devices.component';

describe('InventoryDevicesComponent', () => {
  let component: InventoryDevicesComponent;
  let fixture: ComponentFixture<InventoryDevicesComponent>;
  let orchService: OrchestratorService;

  const fakeAuthStorageService = {
    getPermissions: () => {
      return new Permissions({ osd: ['read', 'update', 'create', 'delete'] });
    }
  };

  const mockOrchStatus = (available: boolean, features?: OrchestratorFeature[]) => {
    const orchStatus = { available: available, description: '', features: {} };
    if (features) {
      features.forEach((feature: OrchestratorFeature) => {
        orchStatus.features[feature] = { available: true };
      });
    }
    component.orchStatus = orchStatus;
  };

  configureTestBed({
    imports: [
      BrowserAnimationsModule,
      FormsModule,
      HttpClientTestingModule,
      SharedModule,
      RouterTestingModule,
      ToastrModule.forRoot()
    ],
    providers: [
      { provide: AuthStorageService, useValue: fakeAuthStorageService },
      TableActionsComponent
    ],
    declarations: [InventoryDevicesComponent]
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryDevicesComponent);
    component = fixture.componentInstance;
    orchService = TestBed.inject(OrchestratorService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have columns that are sortable', () => {
    expect(component.columns.every((column) => Boolean(column.prop))).toBeTruthy();
  });

  describe('table actions', () => {
    const fakeDevices = require('./fixtures/inventory_list_response.json');

    beforeEach(() => {
      component.devices = fakeDevices;
      component.selectionType = 'single';
      fixture.detectChanges();
    });

    const verifyTableActions = async (
      tableActions: CdTableAction[],
      expectResult: {
        [action: string]: { disabled: boolean; disableDesc: string };
      }
    ) => {
      fixture.detectChanges();
      await fixture.whenStable();
      const tableActionElement = fixture.debugElement.query(By.directive(TableActionsComponent));
      // There is actually only one action for now
      const actions = {};
      tableActions.forEach((action) => {
        const actionElement = tableActionElement.query(By.css('button'));
        actions[action.name] = {
          disabled: actionElement.classes.disabled,
          disableDesc: actionElement.properties.title
        };
      });
      expect(actions).toEqual(expectResult);
    };

    const testTableActions = async (
      orch: boolean,
      features: OrchestratorFeature[],
      tests: { selectRow?: number; expectResults: any }[]
    ) => {
      mockOrchStatus(orch, features);
      fixture.detectChanges();
      await fixture.whenStable();

      for (const test of tests) {
        if (test.selectRow) {
          component.selection = new CdTableSelection();
          component.selection.selected = [test.selectRow];
        }
        await verifyTableActions(component.tableActions, test.expectResults);
      }
    };

    it('should have correct states when Orchestrator is enabled', async () => {
      const tests = [
        {
          expectResults: {
            Identify: { disabled: true, disableDesc: '' }
          }
        },
        {
          selectRow: fakeDevices[0],
          expectResults: {
            Identify: { disabled: false, disableDesc: '' }
          }
        }
      ];

      const features = [OrchestratorFeature.DEVICE_BLINK_LIGHT];
      await testTableActions(true, features, tests);
    });

    it('should have correct states when Orchestrator is disabled', async () => {
      const resultNoOrchestrator = {
        disabled: true,
        disableDesc: orchService.disableMessages.noOrchestrator
      };
      const tests = [
        {
          expectResults: {
            Identify: { disabled: true, disableDesc: '' }
          }
        },
        {
          selectRow: fakeDevices[0],
          expectResults: {
            Identify: resultNoOrchestrator
          }
        }
      ];
      await testTableActions(false, [], tests);
    });

    it('should have correct states when Orchestrator features are missing', async () => {
      const resultMissingFeatures = {
        disabled: true,
        disableDesc: orchService.disableMessages.missingFeature
      };
      const expectResults = [
        {
          expectResults: {
            Identify: { disabled: true, disableDesc: '' }
          }
        },
        {
          selectRow: fakeDevices[0],
          expectResults: {
            Identify: resultMissingFeatures
          }
        }
      ];
      await testTableActions(true, [], expectResults);
    });
  });
});