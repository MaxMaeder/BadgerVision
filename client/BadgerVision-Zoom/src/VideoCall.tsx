import {
  ActionIcon,
  Box,
  Button,
  Center,
  Flex,
  Group,
  LoadingOverlay,
  Stack,
  Text,
} from "@mantine/core";
import ZoomVideo, {
  VideoClient,
  VideoPlayer,
  VideoQuality,
} from "@zoom/videosdk";
import { PhoneOff, Share } from "lucide-react";
import { useRef, useState } from "react";
import {
  ZOOM_BROADCAST_URL,
  ZOOM_STREAM_KEY,
  ZOOM_STREAM_URL,
} from "./secrets/zoom";

type VideoCallProps = {
  zoomSessionName: string;
  zoomJwt: string;
};

const VideoCall = ({ zoomSessionName, zoomJwt }: VideoCallProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [inSession, setinSession] = useState(false);

  const client = useRef<typeof VideoClient>(ZoomVideo.createClient());
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const joinSession = async () => {
    await client.current.init("en-US", "Global", { patchJsMedia: true });
    client.current.on(
      "peer-video-state-change",
      (payload) => void renderVideo(payload)
    );
    const userName = `User-${new Date().getTime().toString().slice(8)}`;
    await client.current.join(zoomSessionName, zoomJwt, userName);
    setinSession(true);
    setIsLoading(true);

    const mediaStream = client.current.getMediaStream();
    await mediaStream.startAudio();
    await mediaStream.startVideo();
    await renderVideo({
      action: "Start",
      userId: client.current.getCurrentUserInfo().userId,
    });

    setIsLoading(false);
  };

  const startLivestream = async () => {
    const liveStreamClient = client.current.getLiveStreamClient();
    await liveStreamClient.startLiveStream(
      ZOOM_STREAM_URL,
      zoomSessionName,
      ZOOM_BROADCAST_URL
    );
  };

  const renderVideo = async (event: {
    action: "Start" | "Stop";
    userId: number;
  }) => {
    const mediaStream = client.current.getMediaStream();
    if (event.action === "Stop") {
      const element = await mediaStream.detachVideo(event.userId);
      if (Array.isArray(element)) element.forEach((el) => el.remove());
      else element.remove();
    } else {
      const userVideo = await mediaStream.attachVideo(
        event.userId,
        VideoQuality.Video_360P
      );
      videoContainerRef.current!.appendChild(userVideo as VideoPlayer);
    }
  };

  const leaveSession = async () => {
    client.current.off(
      "peer-video-state-change",
      (payload: { action: "Start" | "Stop"; userId: number }) =>
        void renderVideo(payload)
    );
    await client.current.leave();
    const liveStreamClient = client.current.getLiveStreamClient();
    await liveStreamClient.stopLiveStream();
    setinSession(false);
  };

  return (
    <Box>
      <LoadingOverlay
        visible={isLoading}
        zIndex={1000}
        overlayProps={{ opacity: 1.0 }}
      />
      <Box display={inSession ? "block" : "none"}>
        <Stack gap={0}>
          <video-player-container ref={videoContainerRef} />
          <Flex justify="space-between">
            <Text c="dimmed">Session: {zoomSessionName}</Text>
            <Text c="dimmed">JWT: ...{zoomJwt.slice(-10)}</Text>
          </Flex>
        </Stack>
      </Box>
      {!inSession ? (
        <Button onClick={joinSession}>Start Identification</Button>
      ) : (
        <Group mt="lg" justify="center">
          <ActionIcon variant="filled" size="xl" onClick={leaveSession}>
            <PhoneOff />
          </ActionIcon>
          <ActionIcon variant="filled" size="xl" onClick={startLivestream}>
            <Share />
          </ActionIcon>
        </Group>
      )}
    </Box>
  );
};

export default VideoCall;
