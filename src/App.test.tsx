import { render, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

jest.mock("@descope/react-sdk", () => ({
  ...jest.requireActual("@descope/react-sdk"),
  Descope: jest.fn(() => <div />),
}));

describe("App component", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DESCOPE_PROJECT_ID = "";
  });

  test("displays Welcome component when projectId is missing", async () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/invalid-project-id",
      },
      writable: true, // possibility to override
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: () => undefined,
      },
    });

    const { getByTestId } = render(<App />);
    expect(getByTestId("welcome-component")).toBeInTheDocument();
    expect(getByTestId("welcome-copy-component")).toBeInTheDocument();
    expect(getByTestId("welcome-copy-icon")).toBeInTheDocument();
    fireEvent.click(getByTestId("welcome-copy-component"));
    await waitFor(() => expect(getByTestId("welcome-copied-icon")).toBeInTheDocument());
  });

  test("displays Descope component when projectId is valid and part of the location", async () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/P2Qbs5l8F1kD1g2inbBktiCDummy",
      },
      writable: true, // possibility to override
    });
    const { getByTestId } = render(<App />);
    expect(getByTestId("descope-component")).toBeInTheDocument();
  });

  test("displays Descope component when projectId is invalid and part of the location", async () => {
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/P2Qbs5l8F1kD1g2inbBktiCDumm",
      },
      writable: true, // possibility to override
    });
    const { getByTestId } = render(<App />);
    expect(getByTestId("welcome-component")).toBeInTheDocument();
  });

  test("displays Descope component when projectId is valid and as an env var", async () => {
    process.env.DESCOPE_PROJECT_ID = "P2Qbs5l8F1kD1g2inbBktiCDummy";
    const { getByTestId } = render(<App />);
    expect(getByTestId("descope-component")).toBeInTheDocument();
  });

  test("displays Descope component when projectId is invalid and as an env var", async () => {
    process.env.DESCOPE_PROJECT_ID = "P2Qbs5l8F1kD1g2inbBktiCDumm";
    const { getByTestId } = render(<App />);
    expect(getByTestId("welcome-component")).toBeInTheDocument();
  });
});
