import React, { useState, useEffect } from "react";
import Navigation from "./Navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function App() {
  /************************************************************
   *                 1️⃣ SET GLOBAL STATES
   * Note: These states are brought up to the common parent
   * amongst the screens to ensure all screens can access
   * the states.
   * * User data is fetched from the database
   ************************************************************/
  const [currentUser, setCurrentUser] = useState(null);

  /************************************************************
   *                  2️⃣ LOAD LOGGED IN USERS
   * Note: useEffect is used together with the dependency array
   * to only load the logged in user on the first load.
   * Note: Async storage is used to store userData.
   ************************************************************/
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await AsyncStorage.getItem("userData");
        if (data) {
          setCurrentUser(JSON.parse(data)); // restore login
        }
      } catch (err) {
        console.log("Error loading user:", err);
      }
    };
    loadUser();
  }, []);

  return (
    <Navigation currentUser={currentUser} setCurrentUser={setCurrentUser} />
  );
}
