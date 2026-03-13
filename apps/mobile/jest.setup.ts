jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockWebView = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      const instance = {
        goBack: jest.fn(),
        reload: jest.fn(),
      };

      if (typeof ref === "function") {
        ref(instance);
      } else if (ref && "current" in ref) {
        ref.current = instance;
      }

      (globalThis as Record<string, unknown>).__lastWebViewProps = props;
      (globalThis as Record<string, unknown>).__lastWebViewInstance = instance;

      return React.createElement(View, { testID: "webview" });
    },
  );

  return {
    WebView: MockWebView,
  };
});
