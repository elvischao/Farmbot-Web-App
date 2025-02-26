import {
  BotLocationData, BotPosition, BotState, UserEnv,
} from "../../devices/interfaces";
import { McuParams, Xyz, FirmwareHardware } from "farmbot";
import { GetWebAppConfigValue } from "../../config_storage/actions";

export interface MoveProps {
  dispatch: Function;
  bot: BotState;
  arduinoBusy: boolean;
  firmwareSettings: McuParams;
  getWebAppConfigVal: GetWebAppConfigValue;
  env: UserEnv;
  firmwareHardware: FirmwareHardware | undefined;
}

export type ButtonDirection = "up" | "down" | "left" | "right";

export interface DirectionButtonProps {
  axis: Xyz;
  direction: ButtonDirection;
  directionAxisProps: {
    isInverted: boolean;
    stopAtHome: boolean;
    stopAtMax: boolean;
    axisLength: number;
    negativeOnly: boolean;
    position: number | undefined;
  }
  steps: number;
  arduinoBusy: boolean | undefined;
  botOnline: boolean | undefined;
  locked: boolean;
  botPosition: BotPosition;
  click(): void;
  active: string | undefined;
}

export interface TakePhotoButtonProps {
  env: UserEnv;
  disabled?: boolean;
}

export interface HomeButtonProps {
  doFindHome: boolean;
  arduinoBusy: boolean | undefined;
  botOnline: boolean | undefined;
  locked: boolean;
  homeDirection?: number;
}

export interface StepSizeSelectorProps {
  dispatch: Function;
  selected: number;
}

export interface DirectionAxesProps {
  botPosition: BotPosition;
  firmwareSettings: McuParams;
  getConfigValue: GetWebAppConfigValue;
}

export interface JogMovementControlsProps extends DirectionAxesProps {
  stepSize: number;
  botOnline: boolean;
  env: UserEnv;
  arduinoBusy: boolean;
  locked: boolean;
  highlightAxis?: Xyz;
  highlightDirection?: "both" | undefined;
  highlightHome?: boolean;
}

export interface JogControlsGroupProps extends JogMovementControlsProps {
  dispatch: Function;
}

export interface ControlsPopupProps extends JogControlsGroupProps {
  isOpen: boolean;
}

export interface BotPositionRowsProps {
  locationData: BotLocationData;
  getConfigValue: GetWebAppConfigValue;
  arduinoBusy: boolean;
  locked: boolean;
  firmwareSettings: McuParams;
  firmwareHardware: FirmwareHardware | undefined;
  botOnline: boolean;
}

export interface AxisActionsProps {
  arduinoBusy: boolean;
  locked: boolean;
  hardwareDisabled: boolean;
  botOnline: boolean;
  axis: Xyz;
}

export interface MoveControlsProps {
  dispatch: Function;
  bot: BotState;
  getConfigValue: GetWebAppConfigValue;
  firmwareSettings: McuParams;
  firmwareHardware: FirmwareHardware | undefined;
  env: UserEnv;
  highlightAxis?: Xyz;
  highlightDirection?: "both" | undefined;
  highlightHome?: boolean;
}
