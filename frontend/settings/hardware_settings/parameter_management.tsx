import React from "react";
import { ParameterManagementProps, ShowAdvancedToggleProps } from "./interfaces";
import { Row, Col, BlurableInput, Help, ToggleButton, Popover } from "../../ui";
import { Header } from "./header";
import { Collapse, Position } from "@blueprintjs/core";
import { Content, DeviceSetting, ToolTips } from "../../constants";
import { t } from "../../i18next_wrapper";
import { Highlight } from "../maybe_highlight";
import { SettingLoadProgress } from "./setting_load_progress";
import {
  FwParamExportMenu, importParameters, resendParameters,
} from "./export_menu";
import {
  ToggleHighlightModified,
} from "../../photos/data_management/toggle_highlight_modified";
import { BooleanSetting } from "../../session_keys";
import { setWebAppConfigValue } from "../../config_storage/actions";
import { getModifiedClassName, modifiedFromDefault } from "../default_values";

export function ParameterManagement(props: ParameterManagementProps) {
  const {
    dispatch, onReset, botOnline, arduinoBusy, firmwareHardware,
    getConfigValue, showAdvanced,
  } = props;
  const { parameter_management } = props.settingsPanelState;
  return <Highlight className={"section"}
    settingName={DeviceSetting.parameterManagement}>
    <Header
      expanded={parameter_management}
      title={DeviceSetting.parameterManagement}
      panel={"parameter_management"}
      dispatch={dispatch} />
    <Collapse isOpen={!!parameter_management}>
      <Highlight settingName={DeviceSetting.paramLoadProgress}
        hidden={!showAdvanced}
        className={"advanced"}>
        <Row>
          <Col xs={7}>
            <label style={{ lineHeight: "1.5rem", display: "inline" }}>
              {t(DeviceSetting.paramLoadProgress)}
            </label>
            <Help text={ToolTips.PARAMETER_LOAD_PROGRESS} />
          </Col>
          <Col xs={5} className={"centered-button-div"}>
            <SettingLoadProgress botOnline={botOnline}
              firmwareHardware={firmwareHardware}
              firmwareConfig={props.firmwareConfig}
              sourceFwConfig={props.sourceFwConfig} />
          </Col>
        </Row>
      </Highlight>
      <Highlight settingName={DeviceSetting.paramResend}>
        <Row>
          <Col xs={8}>
            <label style={{ lineHeight: "1.5rem" }}>
              {t(DeviceSetting.paramResend)}
            </label>
          </Col>
          <Col xs={4} className={"centered-button-div"}>
            <button
              className="fb-button yellow"
              disabled={arduinoBusy || !botOnline}
              title={t("RESEND")}
              onClick={() => dispatch(resendParameters())}>
              {t("RESEND")}
            </button>
          </Col>
        </Row>
      </Highlight>
      <Highlight settingName={DeviceSetting.exportParameters}
        hidden={!showAdvanced}
        className={"advanced"}>
        <Row>
          <Col xs={8}>
            <label style={{ lineHeight: "1.5rem" }}>
              {t(DeviceSetting.exportParameters)}
            </label>
          </Col>
          <Col xs={4} className={"centered-button-div"}>
            <Popover position={Position.BOTTOM_RIGHT}
              target={<i className="fa fa-download" />}
              content={
                <FwParamExportMenu firmwareConfig={props.firmwareConfig} />} />
          </Col>
        </Row>
      </Highlight>
      <ParameterImport dispatch={dispatch} arduinoBusy={arduinoBusy}
        showAdvanced={showAdvanced} />
      <Highlight settingName={DeviceSetting.highlightModifiedSettings}
        hidden={!(showAdvanced
          || modifiedFromDefault(BooleanSetting.highlight_modified_settings))}
        className={"advanced"}>
        <ToggleHighlightModified
          dispatch={dispatch}
          getConfigValue={getConfigValue} />
      </Highlight>
      <Highlight settingName={DeviceSetting.showAdvancedSettings}>
        <ShowAdvancedToggle dispatch={dispatch} getConfigValue={getConfigValue} />
      </Highlight>
      <Highlight settingName={DeviceSetting.resetHardwareParams}
        hidden={!showAdvanced}
        className={"advanced"}>
        <Row>
          <Col xs={8}>
            <label style={{ lineHeight: "1.5rem" }}>
              {t(DeviceSetting.resetHardwareParams)}
            </label>
            <Help text={Content.RESTORE_DEFAULT_HARDWARE_SETTINGS} />
          </Col>
          <Col xs={4} className={"centered-button-div"}>
            <button
              className="fb-button red"
              disabled={arduinoBusy || !botOnline}
              title={t("RESET")}
              onClick={onReset}>
              {t("RESET")}
            </button>
          </Col>
        </Row>
      </Highlight>
    </Collapse>
  </Highlight>;
}

export interface ParameterImportProps {
  dispatch: Function;
  arduinoBusy: boolean;
  showAdvanced: boolean;
}

interface ParameterImportState {
  input: string;
}

export class ParameterImport
  extends React.Component<ParameterImportProps, ParameterImportState> {
  state: ParameterImportState = { input: "" };
  render() {
    return <Highlight settingName={DeviceSetting.importParameters}
      hidden={!this.props.showAdvanced}
      className={"advanced"}>
      <Row>
        <Col xs={12}>
          <label>
            {t(DeviceSetting.importParameters)}
          </label>
          <Help text={ToolTips.PARAMETER_IMPORT} />
        </Col>
      </Row>
      <Row>
        <Col xs={9} className={"centered-button-div"}>
          <BlurableInput value={this.state.input} onCommit={e =>
            this.setState({ input: e.currentTarget.value })} />
        </Col>
        <Col xs={3} className={"centered-button-div"}>
          <button
            className="fb-button yellow"
            disabled={this.props.arduinoBusy}
            title={t("IMPORT")}
            onClick={() => confirm(Content.PARAMETER_IMPORT_CONFIRM) &&
              this.props.dispatch(importParameters(this.state.input))}>
            {t("IMPORT")}
          </button>
        </Col>
      </Row>
    </Highlight>;
  }
}

export const ShowAdvancedToggle = (props: ShowAdvancedToggleProps) => {
  const showAdvanced = !!props.getConfigValue(
    BooleanSetting.show_advanced_settings);
  return <div className={"show-advanced-toggle"}>
    <label>{t(DeviceSetting.showAdvancedSettings)}</label>
    <ToggleButton
      className={getModifiedClassName(BooleanSetting.show_advanced_settings)}
      toggleValue={!!showAdvanced}
      toggleAction={() => props.dispatch(setWebAppConfigValue(
        BooleanSetting.show_advanced_settings,
        !showAdvanced))} />
  </div>;
};
