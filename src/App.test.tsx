import { render, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

describe("App component", () => {
  test("renders without errors", () => {
    render(<App />);
  });

  test("displays Error component when projectId is invalid", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: () => undefined,
      },
    });

    window.location.pathname = "/invalid-project-id";
    const { getByTestId } = render(<App />);
    expect(getByTestId("welcome-component")).toBeInTheDocument();
    expect(getByTestId("welcome-copy-component")).toBeInTheDocument();
    expect(getByTestId("welcome-copy-icon")).toBeInTheDocument();
    fireEvent.click(getByTestId("welcome-copy-component"));
    await waitFor(() => expect(getByTestId("welcome-copied-icon")).toBeInTheDocument());
  });

  test("displays Descope component when projectId is valid", () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/P2Qbs5l8F1kD1g2inbBktiCDummy",
      },
      writable: true, // possibility to override
    });
    const { getByTestId } = render(<App />);
    expect(getByTestId("descope-component")).toBeInTheDocument();
  });
});
