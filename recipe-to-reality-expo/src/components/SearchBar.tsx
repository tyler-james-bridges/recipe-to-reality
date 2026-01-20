import React from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color="#999"
        style={styles.icon}
      />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <MaterialCommunityIcons name="close-circle" size={18} color="#999" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 8,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
});
