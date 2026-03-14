import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import PocodexApp from "../src/PocodexApp";
import type { SettingsStore } from "../src/storage";

function createMemoryStore(initialUrl: string | null = null): SettingsStore {
  let savedUrl = initialUrl;

  return {
    async getSavedUrl() {
      return savedUrl;
    },
    async saveUrl(url: string) {
      savedUrl = url;
    },
    async clearUrl() {
      savedUrl = null;
    },
  };
}

function getLastWebViewProps(): Record<string, unknown> {
  return (globalThis as Record<string, unknown>).__lastWebViewProps as Record<string, unknown>;
}

describe("PocodexApp", () => {
  it("starts on setup when no saved URL exists", async () => {
    const store = createMemoryStore();
    const screen = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(screen.getByTestId("url-input")).toBeTruthy();
    });

    expect(screen.queryByTestId("webview")).toBeNull();
  });

  it("saves a URL override and auto-opens it on the next launch", async () => {
    const store = createMemoryStore();
    const firstLaunch = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(firstLaunch.getByTestId("url-input")).toBeTruthy();
    });

    fireEvent.changeText(
      firstLaunch.getByTestId("url-input"),
      "http://192.168.1.30:8787/?token=abc",
    );
    fireEvent.press(firstLaunch.getByTestId("save-url-button"));

    await waitFor(() => {
      expect(firstLaunch.getByTestId("webview")).toBeTruthy();
    });
    firstLaunch.unmount();

    const secondLaunch = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(secondLaunch.getByTestId("webview")).toBeTruthy();
    });

    expect(getLastWebViewProps().source).toEqual({ uri: "http://192.168.1.30:8787/?token=abc" });
  });

  it("updates the saved URL from settings", async () => {
    const store = createMemoryStore("http://192.168.1.30:8787/?token=abc");
    const screen = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("settings-button"));
    fireEvent.changeText(
      screen.getByTestId("settings-url-input"),
      "https://pocodex.internal/mobile",
    );
    fireEvent.press(screen.getByTestId("settings-save-button"));

    await waitFor(() => {
      expect(getLastWebViewProps().source).toEqual({ uri: "https://pocodex.internal/mobile" });
    });
  });

  it("clears a saved URL back to first-run setup", async () => {
    const store = createMemoryStore("http://192.168.1.30:8787/?token=abc");
    const screen = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(screen.getByTestId("settings-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("settings-button"));
    fireEvent.press(screen.getByTestId("clear-url-button"));

    await waitFor(() => {
      expect(screen.getByTestId("url-input")).toBeTruthy();
    });

    expect(screen.queryByTestId("webview")).toBeNull();
  });

  it("shows retry and edit actions after a load error", async () => {
    const store = createMemoryStore("http://192.168.1.30:8787/?token=abc");
    const screen = render(<PocodexApp settingsStore={store} />);

    await waitFor(() => {
      expect(screen.getByTestId("webview")).toBeTruthy();
    });

    await act(async () => {
      const props = getLastWebViewProps();
      const onError = props.onError as (event: { nativeEvent: { description: string } }) => void;
      onError({ nativeEvent: { description: "Network request failed" } });
    });

    expect(screen.getByText("Retry")).toBeTruthy();
    expect(screen.getByText("Edit URL")).toBeTruthy();
  });
});
