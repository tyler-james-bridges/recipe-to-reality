import React from 'react'
import { Platform, StyleProp, ViewStyle } from 'react-native'
import { SymbolView, SFSymbol } from 'expo-symbols'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
type MaterialName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

const IONICONS_TO_SF: Record<string, SFSymbol> = {
  home: 'house.fill',
  'home-outline': 'house',
  'arrow-back': 'arrow.left',
  'arrow-forward': 'arrow.right',
  'chevron-back': 'chevron.left',
  'chevron-forward': 'chevron.right',
  'chevron-up': 'chevron.up',
  'chevron-down': 'chevron.down',
  add: 'plus',
  'add-outline': 'plus',
  'add-circle': 'plus.circle.fill',
  'add-circle-outline': 'plus.circle',
  'remove-circle': 'minus.circle.fill',
  'remove-circle-outline': 'minus.circle',
  close: 'xmark',
  'close-circle': 'xmark.circle.fill',
  'close-circle-outline': 'xmark.circle',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'checkmark-circle-outline': 'checkmark.circle',
  refresh: 'arrow.clockwise',
  trash: 'trash.fill',
  'trash-outline': 'trash',
  pencil: 'pencil',
  create: 'square.and.pencil',
  share: 'square.and.arrow.up',
  menu: 'line.3.horizontal',
  'ellipsis-horizontal': 'ellipsis',
  search: 'magnifyingglass',
  'search-outline': 'magnifyingglass',
  list: 'list.bullet',
  book: 'book.fill',
  'book-outline': 'book',
  'document-text': 'doc.text.fill',
  'document-text-outline': 'doc.text',
  image: 'photo.fill',
  camera: 'camera.fill',
  videocam: 'video.fill',
  heart: 'heart.fill',
  'heart-outline': 'heart',
  star: 'star.fill',
  'star-outline': 'star',
  bookmark: 'bookmark.fill',
  'bookmark-outline': 'bookmark',
  cart: 'cart.fill',
  'cart-outline': 'cart',
  bag: 'bag.fill',
  basket: 'basket.fill',
  time: 'clock.fill',
  'time-outline': 'clock',
  calendar: 'calendar',
  'calendar-outline': 'calendar',
  snow: 'snowflake',
  'snow-outline': 'snowflake',
  leaf: 'leaf.fill',
  flame: 'flame.fill',
  restaurant: 'fork.knife',
  nutrition: 'carrot',
  settings: 'gearshape.fill',
  'settings-outline': 'gearshape',
  notifications: 'bell.fill',
  'notifications-outline': 'bell',
  'information-circle': 'info.circle.fill',
  'information-circle-outline': 'info.circle',
  'alert-circle': 'exclamationmark.circle.fill',
  'alert-circle-outline': 'exclamationmark.circle',
  warning: 'exclamationmark.triangle.fill',
  'help-circle': 'questionmark.circle.fill',
  link: 'link',
  globe: 'globe',
  sparkles: 'sparkles',
  flash: 'bolt.fill',
  'flash-outline': 'bolt',
  clipboard: 'list.clipboard.fill',
  'clipboard-outline': 'list.clipboard',
  layers: 'square.stack.fill',
  person: 'person.fill',
  'person-outline': 'person',
  'person-circle': 'person.circle.fill',
  people: 'person.2.fill',
  'people-outline': 'person.2',
  'play-circle': 'play.circle.fill',
  'play-circle-outline': 'play.circle',
  'musical-notes': 'music.note.list',
}

const MATERIAL_TO_SF: Record<string, SFSymbol> = {
  infinity: 'infinity',
  crown: 'crown.fill',
  'chef-hat': 'fork.knife',
  'frying-pan': 'frying.pan',
  'fridge-outline': 'refrigerator',
  fridge: 'refrigerator.fill',
  carrot: 'carrot',
  'check-circle': 'checkmark.circle.fill',
  video: 'video.fill',
  'information-outline': 'info.circle',
  'chevron-right': 'chevron.right',
  'chevron-left': 'chevron.left',
}

export interface IconProps {
  name: IoniconsName
  size?: number
  color?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function Icon({ name, size = 24, color, style, testID }: IconProps) {
  if (Platform.OS === 'ios' && IONICONS_TO_SF[name]) {
    return (
      <SymbolView
        name={IONICONS_TO_SF[name]}
        size={size}
        tintColor={color}
        style={style}
        testID={testID}
      />
    )
  }

  return <Ionicons name={name} size={size} color={color} style={style as any} testID={testID} />
}

export interface MaterialIconProps {
  name: MaterialName
  size?: number
  color?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function MaterialIcon({ name, size = 24, color, style, testID }: MaterialIconProps) {
  if (Platform.OS === 'ios' && MATERIAL_TO_SF[name as string]) {
    return (
      <SymbolView
        name={MATERIAL_TO_SF[name as string]}
        size={size}
        tintColor={color}
        style={style}
        testID={testID}
      />
    )
  }

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      style={style as any}
      testID={testID}
    />
  )
}

export default Icon
