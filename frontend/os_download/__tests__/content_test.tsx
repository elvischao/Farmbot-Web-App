import React from "react";
import { mount } from "enzyme";
import { OsDownloadPage } from "../content";
import { clickButton } from "../../__test_support__/helpers";

describe("<OsDownloadPage />", () => {
  it("renders", () => {
    globalConfig.rpi3_release_url = "fake rpi3 img url";
    globalConfig.rpi3_release_tag = "1.0.1";

    globalConfig.rpi_release_url = "fake rpi img url";
    globalConfig.rpi_release_tag = "1.0.0";

    const wrapper = mount(<OsDownloadPage />);
    clickButton(wrapper, 2, "show all download links");

    const rpi3Link = wrapper.find("a").first();
    expect(rpi3Link.text()).toEqual("DOWNLOAD v1.0.1");
    expect(rpi3Link.props().href).toEqual("fake rpi3 img url");

    const rpiLink = wrapper.find("a").last();
    expect(rpiLink.text()).toEqual("DOWNLOAD v1.0.0");
    expect(rpiLink.props().href).toEqual("fake rpi img url");
  });

  it("renders on small screens", () => {
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    const wrapper = mount(<OsDownloadPage />);
    expect(wrapper.text().toLowerCase()).toContain("download");
  });

  it("renders on large screens", () => {
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    const wrapper = mount(<OsDownloadPage />);
    expect(wrapper.text().toLowerCase()).toContain("download");
  });

  it("toggles the wizard", () => {
    const wrapper = mount(<OsDownloadPage />);
    expect(wrapper.text().toLowerCase()).toContain("show");
    expect(wrapper.text().toLowerCase()).not.toContain("return");
    clickButton(wrapper, 2, "show all download links");
    expect(wrapper.text().toLowerCase()).not.toContain("show");
    expect(wrapper.text().toLowerCase()).toContain("return");
    clickButton(wrapper, 0, "return to the wizard");
    expect(wrapper.text().toLowerCase()).toContain("show");
    expect(wrapper.text().toLowerCase()).not.toContain("return");
  });

  it("runs the wizard: express", () => {
    const wrapper = mount(<OsDownloadPage />);
    clickButton(wrapper, 1, "express", { partial_match: true });
    clickButton(wrapper, 0, "express v1.0");
    expect(wrapper.text().toLowerCase()).toContain("zero");
  });

  it("runs the wizard: genesis", () => {
    const wrapper = mount(<OsDownloadPage />);
    clickButton(wrapper, 0, "genesis", { partial_match: true });
    clickButton(wrapper, 4, "genesis v1.2");
    expect(wrapper.text().toLowerCase()).toContain("pi 3");
  });

  it("runs the wizard: genesis v1.6.1", () => {
    const wrapper = mount(<OsDownloadPage />);
    clickButton(wrapper, 0, "genesis", { partial_match: true });
    clickButton(wrapper, 0, "genesis v1.6");
    clickButton(wrapper, 1, "white");
    expect(wrapper.text().toLowerCase()).toContain("pi 4");
  });
});
