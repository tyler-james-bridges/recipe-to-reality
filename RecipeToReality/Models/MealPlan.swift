import Foundation
import SwiftData

@Model
final class MealPlan {
    var id: UUID
    var date: Date
    var mealType: MealType
    var recipeId: UUID?
    var recipeName: String?
    var notes: String?
    var isCompleted: Bool
    var reminder: Bool
    var reminderTime: Date?

    enum MealType: String, Codable, CaseIterable {
        case breakfast = "Breakfast"
        case lunch = "Lunch"
        case dinner = "Dinner"
        case snack = "Snack"

        var icon: String {
            switch self {
            case .breakfast: return "sun.rise"
            case .lunch: return "sun.max"
            case .dinner: return "moon.stars"
            case .snack: return "carrot"
            }
        }

        var defaultTime: (hour: Int, minute: Int) {
            switch self {
            case .breakfast: return (8, 0)
            case .lunch: return (12, 0)
            case .dinner: return (18, 0)
            case .snack: return (15, 0)
            }
        }
    }

    init(
        id: UUID = UUID(),
        date: Date,
        mealType: MealType,
        recipeId: UUID? = nil,
        recipeName: String? = nil,
        notes: String? = nil,
        isCompleted: Bool = false,
        reminder: Bool = false,
        reminderTime: Date? = nil
    ) {
        self.id = id
        self.date = date
        self.mealType = mealType
        self.recipeId = recipeId
        self.recipeName = recipeName
        self.notes = notes
        self.isCompleted = isCompleted
        self.reminder = reminder
        self.reminderTime = reminderTime
    }
}

// MARK: - Date Helpers

extension MealPlan {
    /// Get the start of the day for this meal plan
    var dayStart: Date {
        Calendar.current.startOfDay(for: date)
    }

    /// Check if this meal plan is for today
    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    /// Check if this meal plan is in the past
    var isPast: Bool {
        date < Date() && !isToday
    }

    /// Formatted date string
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: date)
    }

    /// Short day name (Mon, Tue, etc.)
    var shortDayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    /// Day number
    var dayNumber: Int {
        Calendar.current.component(.day, from: date)
    }
}

// MARK: - Meal Plan Query Helpers

extension Array where Element == MealPlan {
    /// Group meal plans by date
    func groupedByDate() -> [Date: [MealPlan]] {
        Dictionary(grouping: self) { Calendar.current.startOfDay(for: $0.date) }
    }

    /// Filter meal plans for a specific date
    func forDate(_ date: Date) -> [MealPlan] {
        let targetDay = Calendar.current.startOfDay(for: date)
        return filter { Calendar.current.startOfDay(for: $0.date) == targetDay }
    }

    /// Filter meal plans for a date range
    func forDateRange(from startDate: Date, to endDate: Date) -> [MealPlan] {
        let start = Calendar.current.startOfDay(for: startDate)
        let end = Calendar.current.startOfDay(for: endDate)
        return filter {
            let day = Calendar.current.startOfDay(for: $0.date)
            return day >= start && day <= end
        }
    }

    /// Get all unique recipe IDs
    var uniqueRecipeIds: [UUID] {
        var seen = Set<UUID>()
        var result = [UUID]()
        for mealPlan in self {
            if let recipeId = mealPlan.recipeId, !seen.contains(recipeId) {
                seen.insert(recipeId)
                result.append(recipeId)
            }
        }
        return result
    }
}
