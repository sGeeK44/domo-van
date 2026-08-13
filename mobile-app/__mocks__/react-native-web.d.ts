// react-native-web ships no types; it mirrors the react-native API the mocks
// stand in for, so borrow that one.
declare module "react-native-web" {
  export * from "react-native";
}
