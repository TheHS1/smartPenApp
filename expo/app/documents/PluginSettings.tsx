import { View, Text, TouchableOpacity, SafeAreaView, FlatList, ListRenderItemInfo, ScrollView } from "react-native"
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlugInfo } from "@/plugins/PluginManager";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import plugArray from "@/plugins/index";
import { Settings, useSettings } from "@/components/SettingsContent";

const plugins: PlugInfo[] = plugArray();

type devLIProps = {
  item: ListRenderItemInfo<PlugInfo>;
  updateSetting: (key: "enabled", value: { [key: string]: boolean }) => void;
  settings: Settings;
}

const PlugLI = ({ item, updateSetting, settings }: devLIProps) => {
  const [showDescription, setShowDescription] = useState<boolean>(false);
  const descriptionHeight = useSharedValue<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>();

  const isEnabled = settings.enabled[item.item.title] ?? false; // Get current state, default to false

  // Update height based on whether the description is shown or not
  if (showDescription) {
    descriptionHeight.value = withTiming(125, { duration: 300 }); // Set height gradually to 120 when shown
  } else {
    descriptionHeight.value = withTiming(0, { duration: 300 }); // Set height gradually back to 0 when collapsed
  }

  // Use animated style to apply the height change to the description Text
  const animatedDescriptionStyle = useAnimatedStyle(() => {
    return {
      height: descriptionHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleSettingsView = () => {
    if (!item.item.Func) return; // Only toggle if settings component exists
    setShowSettings(!showSettings);
    setShowDescription(true);
  }

  return (
    <View
      className="border border-blue-500 rounded-lg my-3 p-3 flex bg-white"
    >
      <View
        className="flex flex-row items-center justify-center"
      >
        <TouchableOpacity className="flex-initial p-2" onPress={() => setShowDescription(!showDescription)}>
          <Ionicons name={showDescription ? "chevron-down-outline" : "chevron-forward-outline"} size={18} color="black" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold">{item.item.title}</Text>
        {item.item.Func && (
          <TouchableOpacity className="flex-initial p-2 mr-2 " onPress={toggleSettingsView}>
            <Ionicons name="cog-outline" size={28} color="gray" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-initial p-1"
          onPress={() => updateSetting('enabled', { ...settings.enabled, [item.item.title]: !isEnabled })}
        >
          <Ionicons name={isEnabled ? "checkmark-circle" : "close-circle-outline"} size={28} color={isEnabled ? "green" : "red"} />
        </TouchableOpacity>
      </View>
      <Animated.View style={animatedDescriptionStyle}>
        <ScrollView>
          {showSettings ? (
            <Text>Settings</Text>
          ) :
            <Text className="text-base text-gray-600">{item.item.description}</Text>
          }
        </ScrollView>
      </Animated.View>
    </View>
  );
}

export default function PluginSettings() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { settings, updateSetting } = useSettings();


  // Show bar in profile page
  useEffect(() => {
    navigation.setOptions({
      headerShown: true
    });
  }, [navigation]);

  const renderListItem = useCallback(
    (item: ListRenderItemInfo<PlugInfo>) => {
      return (
        <PlugLI
          item={item}
          updateSetting={updateSetting}
          settings={settings}
        />
      );
    },
    [settings]
  );

  return (
    <SafeAreaView
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      className="bg-gray-100"
    >
      <View
        className="m-4 h-full flex"
      >
        <Text className="flex-initial font-bold text-3xl">Available Plugins</Text>
        <FlatList
          data={plugins}
          renderItem={renderListItem}
          className="flex-1 pt-2"
        />
      </View>
    </SafeAreaView>
  )

}
