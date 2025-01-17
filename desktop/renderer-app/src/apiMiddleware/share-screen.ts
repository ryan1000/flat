import { globalStore } from "../stores/GlobalStore";
import { AGORA } from "../constants/Process";
import type AgoraSDK from "agora-electron-sdk";

export class RTCShareScreen {
    public constructor(
        private readonly roomUUID: string,
        private readonly roomClient: AgoraSDK,
        private readonly enableShareScreenStatus: (enable: boolean) => void,
        private readonly existOtherUserStream: () => boolean,
    ) {}

    public enable(isDisplayScreen: boolean, screenID: number): void {
        if (!globalStore.rtcShareScreen) {
            return;
        }

        if (this.existOtherUserStream()) {
            return;
        }

        this.enableShareScreenStatus(true);

        const rect = { x: 0, y: 0, width: 0, height: 0 };
        const videoSourceParam = {
            width: 0,
            height: 0,
            bitrate: 500,
            frameRate: 5,
            captureMouseCursor: false,
            windowFocus: false,
            excludeWindowList: [],
            excludeWindowCount: 0,
        };

        this.roomClient.once("videoSourceJoinedSuccess", () => {
            this.roomClient.videoSourceSetVideoProfile(43, false);

            if (isDisplayScreen) {
                this.roomClient.videoSourceStartScreenCaptureByScreen(
                    {
                        // @ts-ignore
                        id: screenID,
                    },
                    rect,
                    videoSourceParam,
                );
            } else {
                this.roomClient.videoSourceStartScreenCaptureByWindow(
                    screenID,
                    rect,
                    videoSourceParam,
                );
            }
        });

        this.roomClient.videoSourceInitialize(AGORA.APP_ID);

        this.roomClient.videoSourceSetChannelProfile(1);

        this.roomClient.videoSourceJoin(
            globalStore.rtcShareScreen.token,
            this.roomUUID,
            "",
            globalStore.rtcShareScreen.uid,
        );
    }

    public close(): Promise<void> {
        return new Promise<void>(resolve => {
            this.roomClient.once("videoSourceLeaveChannel", () => {
                this.roomClient.videoSourceRelease();
                resolve();
            });

            this.roomClient.videoSourceLeave();
        }).finally(() => {
            this.enableShareScreenStatus(false);
        });
    }

    public async destroy(): Promise<void> {
        return await this.close();
    }

    public getScreenInfo(): ScreenInfo {
        const displayList = this.roomClient.getScreenDisplaysInfo() as ScreenDisplaysInfo[];
        const windowList = this.roomClient.getScreenWindowsInfo() as ScreenWindowsInfo[];

        return {
            displayList,
            windowList,
        };
    }
}

export type ScreenDisplaysInfo = {
    readonly displayId: {
        readonly id: number;
    };
    readonly width: number;
    readonly height: number;
    readonly image: Uint8Array;
    readonly isActive: boolean;
    readonly isBuiltin: boolean;
    readonly isMain: boolean;
};

export type ScreenWindowsInfo = {
    readonly windowId: number;
    readonly name: string; // e.g: Google (website title)
    readonly ownerName: string; // e.g: Google Chrome.app
    readonly width: number;
    readonly height: number;
    readonly originWidth: number;
    readonly originHeight: number;
    readonly image: Uint8Array;
    readonly isActive: boolean;
    readonly isBuiltin: boolean;
    readonly isMain: boolean;
};

export type ScreenInfo = {
    displayList: ScreenDisplaysInfo[];
    windowList: ScreenWindowsInfo[];
};
