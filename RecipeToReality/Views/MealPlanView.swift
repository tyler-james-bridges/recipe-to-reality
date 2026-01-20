import SwiftUI
import SwiftData

struct MealPlanView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \MealPlan.date) private var mealPlans: [MealPlan]
    @Query private var recipes: [Recipe]

    @State private var selectedDate = Date()
    @State private var showingAddMeal = false
    @State private var selectedMealType: MealPlan.MealType = .dinner
    @State private var viewMode: ViewMode = .week

    enum ViewMode: String, CaseIterable {
        case week = "Week"
        case month = "Month"
    }

    var currentWeekDates: [Date] {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: selectedDate))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: startOfWeek) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Week/Month Toggle
                Picker("View", selection: $viewMode) {
                    ForEach(ViewMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)

                if viewMode == .week {
                    weekView
                } else {
                    monthView
                }
            }
            .navigationTitle("Meal Plan")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        selectedDate = Date()
                    } label: {
                        Text("Today")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddMeal = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddMeal) {
                AddMealPlanSheet(
                    date: selectedDate,
                    mealType: selectedMealType,
                    recipes: recipes
                )
            }
        }
    }

    // MARK: - Week View

    private var weekView: some View {
        VStack(spacing: 0) {
            // Week navigation
            weekNavigationHeader

            // Day columns
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(currentWeekDates, id: \.self) { date in
                        DayPlanCard(
                            date: date,
                            mealPlans: mealPlans.forDate(date),
                            onAddMeal: { mealType in
                                selectedDate = date
                                selectedMealType = mealType
                                showingAddMeal = true
                            },
                            onDeleteMeal: deleteMealPlan
                        )
                    }
                }
                .padding()
            }
        }
    }

    private var weekNavigationHeader: some View {
        HStack {
            Button {
                moveWeek(by: -1)
            } label: {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Text(weekRangeText)
                .font(.headline)

            Spacer()

            Button {
                moveWeek(by: 1)
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }

    private var weekRangeText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        guard let firstDate = currentWeekDates.first,
              let lastDate = currentWeekDates.last else {
            return ""
        }

        return "\(formatter.string(from: firstDate)) - \(formatter.string(from: lastDate))"
    }

    private func moveWeek(by weeks: Int) {
        if let newDate = Calendar.current.date(byAdding: .weekOfYear, value: weeks, to: selectedDate) {
            selectedDate = newDate
        }
    }

    // MARK: - Month View

    private var monthView: some View {
        VStack(spacing: 0) {
            monthNavigationHeader
            calendarGrid
        }
    }

    private var monthNavigationHeader: some View {
        HStack {
            Button {
                moveMonth(by: -1)
            } label: {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Text(monthYearText)
                .font(.headline)

            Spacer()

            Button {
                moveMonth(by: 1)
            } label: {
                Image(systemName: "chevron.right")
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }

    private var monthYearText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: selectedDate)
    }

    private func moveMonth(by months: Int) {
        if let newDate = Calendar.current.date(byAdding: .month, value: months, to: selectedDate) {
            selectedDate = newDate
        }
    }

    private var calendarGrid: some View {
        let calendar = Calendar.current
        let monthDates = generateMonthDates()

        return VStack(spacing: 0) {
            // Day headers
            HStack(spacing: 0) {
                ForEach(["S", "M", "T", "W", "T", "F", "S"], id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical, 8)

            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(monthDates, id: \.self) { date in
                    CalendarDayCell(
                        date: date,
                        isCurrentMonth: calendar.isDate(date, equalTo: selectedDate, toGranularity: .month),
                        isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                        isToday: calendar.isDateInToday(date),
                        mealCount: mealPlans.forDate(date).count
                    ) {
                        selectedDate = date
                    }
                }
            }

            Divider()

            // Selected day details
            DayDetailView(
                date: selectedDate,
                mealPlans: mealPlans.forDate(selectedDate),
                onAddMeal: { mealType in
                    selectedMealType = mealType
                    showingAddMeal = true
                },
                onDeleteMeal: deleteMealPlan
            )
        }
    }

    private func generateMonthDates() -> [Date] {
        let calendar = Calendar.current
        guard let monthInterval = calendar.dateInterval(of: .month, for: selectedDate),
              let monthFirstWeek = calendar.dateInterval(of: .weekOfMonth, for: monthInterval.start),
              let monthLastWeek = calendar.dateInterval(of: .weekOfMonth, for: monthInterval.end - 1) else {
            return []
        }

        var dates: [Date] = []
        var currentDate = monthFirstWeek.start

        while currentDate < monthLastWeek.end {
            dates.append(currentDate)
            if let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) {
                currentDate = nextDate
            } else {
                break
            }
        }

        return dates
    }

    private func deleteMealPlan(_ mealPlan: MealPlan) {
        modelContext.delete(mealPlan)
    }
}

// MARK: - Day Plan Card

struct DayPlanCard: View {
    let date: Date
    let mealPlans: [MealPlan]
    let onAddMeal: (MealPlan.MealType) -> Void
    let onDeleteMeal: (MealPlan) -> Void

    var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Date header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(date.formatted(.dateTime.weekday(.wide)))
                        .font(.headline)
                        .foregroundStyle(isToday ? .orange : .primary)

                    Text(date.formatted(.dateTime.month().day()))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isToday {
                    Text("Today")
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }

            // Meals
            ForEach(MealPlan.MealType.allCases, id: \.self) { mealType in
                let meals = mealPlans.filter { $0.mealType == mealType }
                MealTypeRow(
                    mealType: mealType,
                    meals: meals,
                    onAdd: { onAddMeal(mealType) },
                    onDelete: onDeleteMeal
                )
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Meal Type Row

struct MealTypeRow: View {
    let mealType: MealPlan.MealType
    let meals: [MealPlan]
    let onAdd: () -> Void
    let onDelete: (MealPlan) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: mealType.icon)
                    .foregroundStyle(.orange)
                Text(mealType.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Button(action: onAdd) {
                    Image(systemName: "plus.circle")
                        .foregroundStyle(.orange)
                }
            }

            if meals.isEmpty {
                Text("No meal planned")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .italic()
            } else {
                ForEach(meals) { meal in
                    HStack {
                        Text(meal.recipeName ?? "Custom meal")
                            .font(.subheadline)
                            .lineLimit(1)

                        Spacer()

                        if meal.isCompleted {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }

                        Button {
                            onDelete(meal)
                        } label: {
                            Image(systemName: "xmark.circle")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.leading, 24)
                }
            }
        }
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let date: Date
    let isCurrentMonth: Bool
    let isSelected: Bool
    let isToday: Bool
    let mealCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text("\(Calendar.current.component(.day, from: date))")
                    .font(.subheadline)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundStyle(
                        isSelected ? .white :
                            (isCurrentMonth ? (isToday ? .orange : .primary) : .secondary)
                    )

                if mealCount > 0 {
                    Circle()
                        .fill(isSelected ? .white : .orange)
                        .frame(width: 6, height: 6)
                }
            }
            .frame(height: 44)
            .frame(maxWidth: .infinity)
            .background(isSelected ? Color.orange : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

// MARK: - Day Detail View

struct DayDetailView: View {
    let date: Date
    let mealPlans: [MealPlan]
    let onAddMeal: (MealPlan.MealType) -> Void
    let onDeleteMeal: (MealPlan) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(date.formatted(.dateTime.weekday(.wide).month().day()))
                    .font(.headline)
                    .padding(.top)

                ForEach(MealPlan.MealType.allCases, id: \.self) { mealType in
                    let meals = mealPlans.filter { $0.mealType == mealType }
                    CompactMealTypeRow(
                        mealType: mealType,
                        meals: meals,
                        onAdd: { onAddMeal(mealType) },
                        onDelete: onDeleteMeal
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Compact Meal Type Row

struct CompactMealTypeRow: View {
    let mealType: MealPlan.MealType
    let meals: [MealPlan]
    let onAdd: () -> Void
    let onDelete: (MealPlan) -> Void

    var body: some View {
        HStack {
            Image(systemName: mealType.icon)
                .foregroundStyle(.orange)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(mealType.rawValue)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                if meals.isEmpty {
                    Text("Add meal")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(meals) { meal in
                        Text(meal.recipeName ?? "Custom")
                            .font(.subheadline)
                    }
                }
            }

            Spacer()

            Button(action: onAdd) {
                Image(systemName: "plus")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    MealPlanView()
        .modelContainer(for: [MealPlan.self, Recipe.self], inMemory: true)
}
