import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

/************************************************************
 *                 1️⃣ IMPORT SCREENS
 * Note: These are the screens used throughout the app.
 ************************************************************/

import HomeScreen from "./src/screens/HomeScreen";
import AddCommuteScreen from "./src/screens/AddCommuteScreen";
import CommutesListScreen from "./src/screens/CommutesListScreen";
import CommuteDetailScreen from "./src/screens/CommuteDetailScreen";
import EditCommuteScreen from "./src/screens/EditCommuteScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import NextBusScreen from "./src/screens/NextBusScreen";
import TrainServiceAlertScreen from "./src/screens/TrainServiceAlertScreen";
import BusRoutesScreen from "./src/screens/BusRouteScreen";

/******************** Navigation ********************/
// Note: All the screens are guarded with a non-user UI
// The Edit COmmute Screen is provided with extra guard here.
const Stack = createNativeStackNavigator();

export default function Navigation({ currentUser, setCurrentUser }) {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="NextBus">
          {(props) => <NextBusScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>
        <Stack.Screen name="TrainServiceAlert">
          {(props) => (
            <TrainServiceAlertScreen {...props} currentUser={currentUser} />
          )}
        </Stack.Screen>
        <Stack.Screen name="BusRoutes">
          {(props) => <BusRoutesScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>
        <Stack.Screen name="AddCommute">
          {(props) => <AddCommuteScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>

        <Stack.Screen name="CommuteDetail">
          {(props) => (
            <CommuteDetailScreen {...props} currentUser={currentUser} />
          )}
        </Stack.Screen>
        <Stack.Screen name="CommuteList">
          {(props) => (
            <CommutesListScreen {...props} currentUser={currentUser} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Analytics">
          {(props) => <AnalyticsScreen {...props} currentUser={currentUser} />}
        </Stack.Screen>
        <Stack.Screen name="Profile">
          {(props) => (
            <ProfileScreen
              {...props}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
            />
          )}
        </Stack.Screen>
        {currentUser ? (
          <>
            <Stack.Screen name="EditCommute">
              {(props) => (
                <EditCommuteScreen {...props} currentUser={currentUser} />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen {...props} setCurrentUser={setCurrentUser} />
              )}
            </Stack.Screen>

            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
