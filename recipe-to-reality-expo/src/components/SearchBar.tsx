import React from 'react';
import { StyleSheet, View, TextInput, Pressable, useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { Icon } from './ui/Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * iOS-style search bar matching UISearchBar appearance
 */
export default function SearchBar({ value, onChangeText, placeholder = 'Search' }: SearchBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA' },
    ]}>
      <Icon
        name="search"
        size={18}
        color="#8E8E93"
        style={styles.icon}
      />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <Icon name="close-circle" size={18} color="#8E8E93" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    marginTop: 8,
    marginHorizontal: 16,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 17,
    height: '100%',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
});
