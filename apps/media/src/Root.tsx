import { Composition } from "remotion";
import { FeatureShowcase } from "./compositions/FeatureShowcase";
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
        durationInFrames={587}
      />

      <Composition
        id="LaunchThumbnail"
        component={LaunchThumbnail}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1}
      />

      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        width={1200}
        height={675}
        fps={30}
        durationInFrames={1}
      />
    </>
  );
};
