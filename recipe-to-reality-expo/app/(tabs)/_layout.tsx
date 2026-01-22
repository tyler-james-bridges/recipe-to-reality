import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="book.fill" />
        <Label>Recipes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pantry">
        <Icon sf="refrigerator.fill" />
        <Label>Pantry</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meal-plan">
        <Icon sf="calendar" />
        <Label>Meal Plan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="grocery">
        <Icon sf="cart.fill" />
        <Label>Grocery</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gearshape.fill" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
