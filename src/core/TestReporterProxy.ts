
import { ITestReporter } from "./Interfaces/classes";
import { MyPanelProvider } from "../MyPanelProvider";

export class TestReporterProxy implements ITestReporter {
    private _proxy: MyPanelProvider | undefined;

    public set proxy(proxy: MyPanelProvider) {
        this._proxy = proxy;
    }

    reportProgress(message: any): void {
        this._proxy?.reportProgress(message);
    }
    reportError(message: string): void {
        this._proxy?.reportError(message);
    }
    reportHistoryCleared(): void {
        this._proxy?.reportHistoryCleared();
    }
    reportTestRunning(): void {
        this._proxy?.reportTestRunning();
    }
}
