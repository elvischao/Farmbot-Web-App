import React from "react";
import { push } from "../history";
import { connect } from "react-redux";
import { Everything, TimeSettings } from "../interfaces";
import { PlantInventoryItem } from "./plant_inventory_item";
import { destroy } from "../api/crud";
import {
  unselectPlant, selectPoint, setHoveredPlant,
} from "../farm_designer/map/actions";
import { Actions, Content } from "../constants";
import { TaggedPlant } from "../farm_designer/map/interfaces";
import { getPlants } from "../farm_designer/state_to_props";
import {
  DesignerPanel, DesignerPanelHeader, DesignerPanelContent,
} from "../farm_designer/designer_panel";
import { t } from "../i18next_wrapper";
import { createGroup } from "../point_groups/actions";
import { PanelColor } from "../farm_designer/panel_header";
import { error } from "../toast/toast";
import {
  PlantDateBulkUpdate, PlantSlugBulkUpdate, PlantStatusBulkUpdate,
  PointColorBulkUpdate,
  PointSizeBulkUpdate,
} from "./edit_plant_status";
import { FBSelect, DropDownItem } from "../ui";
import {
  PointType, TaggedPoint, TaggedGenericPointer, TaggedToolSlotPointer,
  TaggedTool,
  TaggedWeedPointer,
  SpecialStatus,
} from "farmbot";
import { TaggedPointGroup, UUID } from "../resources/interfaces";
import {
  selectAllActivePoints, selectAllToolSlotPointers, selectAllTools,
  selectAllPointGroups,
  maybeGetTimeSettings,
} from "../resources/selectors";
import { PointInventoryItem } from "../points/point_inventory_item";
import { ToolSlotInventoryItem } from "../tools";
import {
  getWebAppConfigValue, GetWebAppConfigValue,
} from "../config_storage/actions";
import { BooleanSetting, NumericSetting } from "../session_keys";
import { isBotOriginQuadrant } from "../farm_designer/interfaces";
import { isActive } from "../tools/edit_tool";
import { noop, uniq } from "lodash";
import { POINTER_TYPES } from "../point_groups/criteria/interfaces";
import { WeedInventoryItem } from "../weeds/weed_inventory_item";
import { pointsSelectedByGroup } from "../point_groups/criteria";
import { ToolTransformProps } from "../tools/interfaces";
import { betterCompact } from "../util";
import { savePoints } from "../farm_designer/map/layers/plants/plant_actions";
import { Path } from "../internal_urls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isPointType = (x: any): x is PointType =>
  POINTER_TYPES.includes(x as PointType);

export const validPointTypes =
  (pointerTypes: unknown[] | undefined): PointType[] | undefined => {
    const validValues = (pointerTypes || [])
      .filter(x => isPointType(x)).map(x => x as PointType);
    return validValues.length > 0 ? validValues : undefined;
  };

export const pointGroupSubset =
  (groups: TaggedPointGroup[], pointerType: PointType) =>
    groups.filter(p =>
      (validPointTypes(p.body.criteria.string_eq.pointer_type) || [])
        .includes(pointerType));

export const uncategorizedGroupSubset = (groups: TaggedPointGroup[]) =>
  groups.filter(p =>
    (validPointTypes(p.body.criteria.string_eq.pointer_type) || []).length < 1);

export const setSelectionPointType = (payload: PointType[] | undefined) =>
  (dispatch: Function) =>
    dispatch({ type: Actions.SET_SELECTION_POINT_TYPE, payload });

export const POINTER_TYPE_DDI_LOOKUP = (): { [x: string]: DropDownItem } => ({
  Plant: { label: t("Plants"), value: "Plant" },
  GenericPointer: { label: t("Points"), value: "GenericPointer" },
  Weed: { label: t("Weeds"), value: "Weed" },
  ToolSlot: { label: t("Slots"), value: "ToolSlot" },
  All: { label: t("All"), value: "All" },
  Other: { label: t("Other"), value: "Other" },
});
export const POINTER_TYPE_LIST = () => [
  POINTER_TYPE_DDI_LOOKUP().Plant,
  POINTER_TYPE_DDI_LOOKUP().GenericPointer,
  POINTER_TYPE_DDI_LOOKUP().Weed,
  POINTER_TYPE_DDI_LOOKUP().ToolSlot,
  POINTER_TYPE_DDI_LOOKUP().All,
];

export const mapStateToProps = (props: Everything): SelectPlantsProps => {
  const getWebAppConfig = getWebAppConfigValue(() => props);
  const xySwap = !!getWebAppConfig(BooleanSetting.xy_swap);
  const rawQuadrant = getWebAppConfig(NumericSetting.bot_origin_quadrant);
  const quadrant = isBotOriginQuadrant(rawQuadrant) ? rawQuadrant : 2;
  const {
    selectedPoints, selectionPointType, openedSavedGarden, bulkPlantSlug,
  } = props.resources.consumers.farm_designer;
  return {
    selected: selectedPoints,
    selectionPointType,
    getConfigValue: getWebAppConfig,
    plants: getPlants(props.resources),
    allPoints: selectAllActivePoints(props.resources.index),
    dispatch: props.dispatch,
    gardenOpen: openedSavedGarden,
    tools: selectAllTools(props.resources.index),
    groups: selectAllPointGroups(props.resources.index),
    isActive: isActive(selectAllToolSlotPointers(props.resources.index)),
    toolTransformProps: { xySwap, quadrant },
    timeSettings: maybeGetTimeSettings(props.resources.index),
    bulkPlantSlug,
  };
};

export interface SelectPlantsProps {
  plants: TaggedPlant[];
  allPoints: TaggedPoint[];
  dispatch: Function;
  selected: UUID[] | undefined;
  selectionPointType: PointType[] | undefined;
  getConfigValue: GetWebAppConfigValue;
  gardenOpen: string | undefined;
  toolTransformProps: ToolTransformProps;
  isActive(id: number | undefined): boolean;
  tools: TaggedTool[];
  groups: TaggedPointGroup[];
  timeSettings: TimeSettings;
  bulkPlantSlug: string | undefined;
}

interface SelectPlantsState {
  group_id: number | undefined;
  moreSelections: boolean;
  moreActions: boolean;
}

export class RawSelectPlants
  extends React.Component<SelectPlantsProps, SelectPlantsState> {
  state: SelectPlantsState = {
    group_id: undefined,
    moreSelections: false,
    moreActions: false,
  };

  componentDidMount() {
    const { dispatch, selected } = this.props;
    if (selected && selected.length == 1) {
      unselectPlant(dispatch)();
    } else {
      dispatch(setHoveredPlant(undefined));
      dispatch({ type: Actions.HOVER_PLANT_LIST_ITEM, payload: undefined });
    }
  }

  componentWillUnmount = () => !this.props.bulkPlantSlug &&
    this.props.dispatch(setSelectionPointType(undefined));

  get selected() { return this.props.selected || []; }

  destroySelected = (plantUUIDs: string[] | undefined) => {
    if (plantUUIDs && plantUUIDs.length > 0 &&
      confirm(t("Are you sure you want to delete {{length}} plants?",
        { length: plantUUIDs.length }))) {
      plantUUIDs.map(uuid => {
        this.props.dispatch(destroy(uuid, true))
          .then(noop, noop);
      });
      push(Path.plants());
    }
  };

  get selectionPointType() {
    const selectionPointTypes = this.props.selectionPointType || ["Plant"];
    return selectionPointTypes.length > 1 ? "All" : selectionPointTypes[0];
  }

  get groupDDILookup(): Record<number, DropDownItem> {
    const lookup: Record<number, DropDownItem> = {};
    this.props.groups.map(group => {
      const { id } = group.body;
      const groupName = group.body.name;
      const count = group.body.member_count || 0;
      const label = `${groupName} (${t("{{count}} items", { count })})`;
      id && (lookup[id] = { label, value: id });
    });
    return lookup;
  }

  selectGroup = (ddi: DropDownItem) => {
    const group_id = parseInt("" + ddi.value);
    this.setState({ group_id });
    const group = this.props.groups
      .filter(pg => pg.body.id == group_id)[0];
    const points = pointsSelectedByGroup(group, this.props.allPoints);
    const pointUuids = points.map(p => p.uuid);
    const pointerTypes =
      group.body.criteria.string_eq.pointer_type as PointType[] | undefined;
    const uniqPointTypes = uniq(points.map(p => p.body.pointer_type));
    const pointTypes =
      uniqPointTypes.length == 1 ? [uniqPointTypes[0]] : undefined;
    this.props.dispatch(setSelectionPointType(
      pointerTypes || pointTypes || POINTER_TYPES));
    this.props.dispatch(selectPoint(pointUuids));
  };

  ActionButtons = () => {
    const unsavedPoints = betterCompact(this.selected.map(uuid =>
      this.props.allPoints.filter(p => p.uuid == uuid)[0])
      .filter(p => p?.specialStatus == SpecialStatus.DIRTY));
    return <div className={["panel-action-buttons",
      this.state.moreSelections ? "more-select" : "",
      this.state.moreActions ? "more-action" : "",
    ].join(" ")}>
      <label>{t("selection type")}</label>
      <FBSelect key={this.selectionPointType}
        list={POINTER_TYPE_LIST()}
        selectedItem={POINTER_TYPE_DDI_LOOKUP()[this.selectionPointType]}
        onChange={ddi => {
          this.props.dispatch(selectPoint(undefined));
          this.setState({ group_id: undefined });
          this.props.dispatch(setSelectionPointType(
            ddi.value == "All" ? POINTER_TYPES : validPointTypes([ddi.value])));
        }} />
      <div className="button-row">
        <button className="fb-button gray"
          title={t("Select none")}
          onClick={() => {
            this.setState({ group_id: undefined });
            this.props.dispatch(selectPoint(undefined));
          }}>
          {t("Select none")}
        </button>
        <button className="fb-button gray"
          title={t("Select all")}
          onClick={() => {
            this.setState({ group_id: undefined });
            this.props.dispatch(selectPoint(this.allPointUuids));
          }}>
          {t("Select all")}
        </button>
        <More className={"more-select"} isOpen={this.state.moreSelections}
          toggleOpen={() =>
            this.setState({ moreSelections: !this.state.moreSelections })}>
          <label>{t("select all in group")}</label>
          <FBSelect key={`${this.selectionPointType}-${this.state.group_id}`}
            list={Object.values(this.groupDDILookup)}
            selectedItem={this.state.group_id
              ? this.groupDDILookup[this.state.group_id]
              : undefined}
            customNullLabel={t("Select a group")}
            onChange={this.selectGroup} />
        </More>
      </div>
      <label>{t("SELECTION ACTIONS")}</label>
      <div className="button-row">
        <button className="fb-button red"
          title={t("Delete")}
          onClick={() => this.destroySelected(this.props.selected)}>
          {t("Delete")}
        </button>
        <button className="fb-button dark-blue"
          title={t("Create group")}
          onClick={() => !this.props.gardenOpen
            ? this.props.dispatch(createGroup({ pointUuids: this.selected }))
            : error(t(Content.ERROR_PLANT_TEMPLATE_GROUP))}>
          {t("Create group")}
        </button>
        {unsavedPoints.length > 1 &&
          <button className={"fb-button green"}
            title={t("Save")}
            onClick={() => savePoints({
              points: unsavedPoints,
              dispatch: this.props.dispatch,
            })}>
            {t("save")}
          </button>}
        <More className={"more-action"} isOpen={this.state.moreActions}
          toggleOpen={() =>
            this.setState({ moreActions: !this.state.moreActions })}>
          {(this.selectionPointType == "Plant" ||
            this.selectionPointType == "Weed") &&
            <PlantStatusBulkUpdate
              pointerType={this.selectionPointType}
              allPoints={this.props.allPoints}
              selected={this.selected}
              dispatch={this.props.dispatch} />}
          {["Plant"].includes(this.selectionPointType) &&
            <PlantDateBulkUpdate
              allPoints={this.props.allPoints}
              selected={this.selected}
              timeSettings={this.props.timeSettings}
              dispatch={this.props.dispatch} />}
          {["Plant", "Weed", "GenericPointer"]
            .includes(this.selectionPointType) &&
            <PointSizeBulkUpdate
              allPoints={this.props.allPoints}
              selected={this.selected}
              dispatch={this.props.dispatch} />}
          {["Weed", "GenericPointer"]
            .includes(this.selectionPointType) &&
            <PointColorBulkUpdate
              allPoints={this.props.allPoints}
              selected={this.selected}
              dispatch={this.props.dispatch} />}
          {["Plant"]
            .includes(this.selectionPointType) &&
            <PlantSlugBulkUpdate
              allPoints={this.props.allPoints}
              selected={this.selected}
              bulkPlantSlug={this.props.bulkPlantSlug}
              dispatch={this.props.dispatch} />}
        </More>
      </div>
    </div>;
  };

  get filteredPoints() {
    const { plants, allPoints, selectionPointType, getConfigValue } = this.props;
    return getFilteredPoints({
      plants, allPoints, selectionPointType, getConfigValue
    });
  }

  get selectedPointData() {
    const { plants, allPoints, selectionPointType } = this.props;
    return getSelectedPoints({
      plants, allPoints, selectionPointType,
      selected: this.selected,
    });
  }

  get allPointUuids() {
    return this.filteredPoints.map(p => p.uuid);
  }

  get itemName() {
    const { value } = POINTER_TYPE_DDI_LOOKUP()[this.selectionPointType];
    const ITEM_NAME_LOOKUP:
      Record<string, Record<"singular" | "plural", string>> =
    {
      "Plant": { singular: t("plant"), plural: t("plants") },
      "GenericPointer": { singular: t("point"), plural: t("points") },
      "Weed": { singular: t("weed"), plural: t("weeds") },
      "ToolSlot": { singular: t("slot"), plural: t("slots") },
      "All": { singular: t("item"), plural: t("items") },
    };
    return ITEM_NAME_LOOKUP["" + value][
      this.selected.length == 1 ? "singular" : "plural"];
  }

  render() {
    const { dispatch } = this.props;
    return <DesignerPanel panelName={"plant-selection"}
      panelColor={PanelColor.lightGray}>
      <DesignerPanelHeader
        panelName={"plant-selection"}
        panelColor={PanelColor.lightGray}
        blackText={true}
        title={t("{{length}} {{name}} selected",
          { length: this.selected.length, name: this.itemName })}
        backTo={Path.plants()}
        onBack={unselectPlant(dispatch)}
        description={Content.BOX_SELECT_DESCRIPTION} />
      <this.ActionButtons />

      <DesignerPanelContent panelName={"plant-selection"}
        className={[
          this.state.moreSelections ? "more-select" : "",
          this.state.moreActions ? "more-action" : "",
        ].join(" ")}>
        {this.selectedPointData.map(p => {
          if (p.kind == "PlantTemplate" || p.body.pointer_type == "Plant") {
            return <PlantInventoryItem
              key={p.uuid}
              plant={p as TaggedPlant}
              hovered={false}
              dispatch={dispatch} />;
          } else {
            switch (p.body.pointer_type) {
              case "GenericPointer":
                return <PointInventoryItem
                  key={p.uuid}
                  tpp={p as TaggedGenericPointer}
                  hovered={false}
                  dispatch={this.props.dispatch} />;
              case "Weed":
                return <WeedInventoryItem
                  key={p.uuid}
                  tpp={p as TaggedWeedPointer}
                  hovered={false}
                  dispatch={this.props.dispatch} />;
              case "ToolSlot":
                return <ToolSlotInventoryItem
                  key={p.uuid}
                  hovered={false}
                  dispatch={this.props.dispatch}
                  toolSlot={p as TaggedToolSlotPointer}
                  isActive={this.props.isActive}
                  tools={this.props.tools}
                  toolTransformProps={this.props.toolTransformProps}
                  hideDropdown={true} />;
            }
          }
        })}
      </DesignerPanelContent>
    </DesignerPanel>;
  }
}

export const SelectPlants = connect(mapStateToProps)(RawSelectPlants);

interface MoreProps {
  className: string;
  isOpen: boolean;
  toggleOpen(): void;
  children: (React.ReactChild | false)[];
}

const More = (props: MoreProps) =>
  <div className={"more"}>
    <div className={"more-button"}
      onClick={props.toggleOpen}>
      <p>{props.isOpen ? t("Less") : t("More")}</p>
      <i className={`fa fa-caret-${props.isOpen ? "up" : "down"}`}
        title={props.isOpen ? t("less") : t("more")} />
    </div>
    <div className={"more-content"} hidden={!props.isOpen}>
      {props.children}
    </div>
  </div>;

export interface GetFilteredPointsProps {
  selectionPointType: PointType[] | undefined;
  plants: TaggedPlant[];
  allPoints: TaggedPoint[];
  getConfigValue?: GetWebAppConfigValue;
}

export const getFilteredPoints = (props: GetFilteredPointsProps) => {
  const selectionPointType = (props.selectionPointType || ["Plant"])
    .filter(x => !props.getConfigValue ||
      getVisibleLayers(props.getConfigValue).includes(x));
  const filterPoints = (p: TaggedPoint) =>
    selectionPointType.includes(p.body.pointer_type);
  const plants = selectionPointType.includes("Plant") ? props.plants : [];
  const otherPoints =
    props.allPoints
      .filter(p => p.body.pointer_type != "Plant")
      .filter(filterPoints);
  const plantsAndOtherPoints: (TaggedPlant | TaggedPoint)[] = [];
  return uniq(plantsAndOtherPoints.concat(plants).concat(otherPoints));
};

interface GetSelectedPointsProps extends GetFilteredPointsProps {
  selected: UUID[];
}

export const getSelectedPoints = (props: GetSelectedPointsProps) =>
  props.selected
    .map(uuid => getFilteredPoints(props).filter(p => p.uuid == uuid)[0])
    .filter(p => p);

enum PointerType {
  Plant = "Plant",
  GenericPointer = "GenericPointer",
  Weed = "Weed",
  ToolSlot = "ToolSlot",
}

const getVisibleLayers = (getConfigValue: GetWebAppConfigValue): PointType[] => {
  const showPlants = getConfigValue(BooleanSetting.show_plants);
  const showPoints = getConfigValue(BooleanSetting.show_points);
  const showWeeds = getConfigValue(BooleanSetting.show_weeds);
  const showFarmbot = getConfigValue(BooleanSetting.show_farmbot);
  return [
    ...(showPlants ? [PointerType.Plant] : []),
    ...(showPoints ? [PointerType.GenericPointer] : []),
    ...(showWeeds ? [PointerType.Weed] : []),
    ...(showFarmbot ? [PointerType.ToolSlot] : []),
  ];
};

export const SelectModeLink = () =>
  <div className="select-mode">
    <button
      className="fb-button gray"
      title={t("open point select panel")}
      onClick={() => push(Path.plants("select"))}>
      {t("select")}
    </button>
  </div>;
