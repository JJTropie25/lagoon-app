import Slider from "@react-native-community/slider";
import { StyleSheet } from "react-native";

export default function UISlider(props: any) {
  return <Slider {...props} style={[styles.slider, props?.style]} />;
}

const styles = StyleSheet.create({
  slider: {
    height: 40,
  },
});
