import React from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated'
import AnimatedPressable from './AnimatedPressable'
import Colors, { radius, typography, spacing, animation } from '@/constants/Colors'
import { ThemedText } from '@/components/Themed'
import { Icon, IconProps } from './Icon'

type IconName = IconProps['name']

interface ChipProps {
  label: string
  selected?: boolean
  onPress?: () => void
  icon?: IconName
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export default function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  style,
}: ChipProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  const selectedValue = useSharedValue(selected ? 1 : 0)

  React.useEffect(() => {
    selectedValue.value = withSpring(selected ? 1 : 0, {
      damping: animation.spring.damping,
      stiffness: animation.spring.stiffness,
    })
  }, [selected])

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      selectedValue.value,
      [0, 1],
      [colorScheme === 'dark' ? colors.cardElevated : colors.skeleton, colors.tint]
    )

    return {
      backgroundColor,
    }
  })

  const textColor = selected ? '#FFFFFF' : colors.text
  const iconColor = selected ? '#FFFFFF' : colors.textTertiary

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hapticType="selection"
      scaleOnPress={0.95}
      style={[disabled && styles.disabled]}
    >
      <Animated.View style={[styles.container, animatedContainerStyle, style]}>
        {icon && <Icon name={icon} size={14} color={iconColor} style={styles.icon} />}
        <ThemedText style={[styles.label, { color: textColor }]}>{label}</ThemedText>
      </Animated.View>
    </AnimatedPressable>
  )
}

export function ChipGroup({
  options,
  selectedKey,
  onSelect,
  style,
}: {
  options: { key: string; label: string; icon?: IconName }[]
  selectedKey: string
  onSelect: (key: string) => void
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.group, style]}>
      {options.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          icon={option.icon}
          selected={selectedKey === option.key}
          onPress={() => onSelect(option.key)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.labelMedium,
  },
  disabled: {
    opacity: 0.5,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
})
