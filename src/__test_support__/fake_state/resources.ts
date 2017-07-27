import { Everything } from "../../interfaces";
import { buildResourceIndex } from "../resource_index_builder";
import { TaggedFarmEvent, TaggedSequence, TaggedRegimen, TaggedImage } from "../../resources/tagged_resources";
import { ExecutableType } from "../../farm_designer/interfaces";
import { fakeResource } from "../fake_resource";

export let resources: Everything["resources"] = buildResourceIndex();

export function fakeSequence(): TaggedSequence {
  return fakeResource("sequences", {
    args: { version: 4 },
    id: 12,
    color: "red",
    name: "fake",
    kind: "sequence",
    body: []
  });
}

export function fakeRegimen(): TaggedRegimen {
  return fakeResource("regimens", {
    name: "Foo",
    color: "red",
    regimen_items: []
  });
}

export function fakeFarmEvent(exe_type: ExecutableType,
  exe_id: number): TaggedFarmEvent {
  return fakeResource("farm_events", {
    "id": 21,
    "start_time": "2017-05-22T05:00:00.000Z",
    "end_time": "2017-05-30T05:00:00.000Z",
    "repeat": 1,
    "time_unit": "never",
    "executable_id": exe_id,
    "executable_type": exe_type,
    "calendar": []
  });
}

export function fakeImage(): TaggedImage {
  return fakeResource("images", {
    id: 23,
    device_id: 46,
    attachment_processed_at: undefined,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    attachment_url: "https://i.redd.it/xz0e2kinm4cz.jpg",
    meta: { x: 0, y: 0, z: 0 }
  });
}
