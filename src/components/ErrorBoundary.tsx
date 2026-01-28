import React, { Component, ReactNode } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Colors, { spacing, typography, radius, shadows } from '../../constants/Colors'
import { getErrorInfo, AppError } from '../services/errors'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a user-friendly fallback UI with recovery options.
 */
class ErrorBoundaryClass extends Component<
  ErrorBoundaryProps & { colorScheme: 'light' | 'dark' },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { colorScheme: 'light' | 'dark' }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null })
    router.replace('/')
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const colors = Colors[this.props.colorScheme]
      const errorInfo = getErrorInfo(this.state.error)

      return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: colors.errorBackground }]}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>

            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {errorInfo.message}
            </Text>

            <View style={[styles.suggestionCard, { backgroundColor: colors.card }, shadows.small]}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={colors.warning}
                style={styles.suggestionIcon}
              />
              <Text style={[styles.suggestion, { color: colors.textSecondary }]}>
                {errorInfo.suggestion}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              {errorInfo.isRetryable && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: colors.tint }]}
                  onPress={this.handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Ionicons name="home-outline" size={20} color={colors.text} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Go Home</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <View style={[styles.debugContainer, { backgroundColor: colors.card }]}>
                <Text style={[styles.debugTitle, { color: colors.textTertiary }]}>
                  Debug Info (DEV only)
                </Text>
                <Text style={[styles.debugText, { color: colors.error }]}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

/**
 * Wrapper component that provides color scheme context
 */
export default function ErrorBoundary(props: ErrorBoundaryProps) {
  const colorScheme = useColorScheme() ?? 'light'
  return <ErrorBoundaryClass {...props} colorScheme={colorScheme} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.titleLarge,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    ...typography.bodyLarge,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: radius.lg,
    marginBottom: spacing['2xl'],
    width: '100%',
  },
  suggestionIcon: {
    marginRight: spacing.md,
    marginTop: 2,
  },
  suggestion: {
    ...typography.bodyMedium,
    flex: 1,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  primaryButton: {},
  primaryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: spacing['3xl'],
    padding: spacing.lg,
    borderRadius: radius.md,
    width: '100%',
  },
  debugTitle: {
    ...typography.labelMedium,
    marginBottom: spacing.sm,
  },
  debugText: {
    ...typography.caption,
    fontFamily: 'monospace',
  },
})
