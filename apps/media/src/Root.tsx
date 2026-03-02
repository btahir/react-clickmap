import { Composition } from "remotion";
import { LaunchThumbnail, LaunchVideo } from "./compositions/LaunchVideo";
import { READMEHero, READMEHeroPoster } from "./compositions/READMEHero";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="READMEHero"
        component={READMEHero}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={180}
      />

      <Composition
        id="READMEHeroPoster"
        component={READMEHeroPoster}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={1}
      />

      <Composition
        id="LaunchVideo"
        component={LaunchVideo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={630}
      />

      <Composition
        id="LaunchThumbnail"
        component={LaunchThumbnail}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1}
      />
    </>
  );
};
