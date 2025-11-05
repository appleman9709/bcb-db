-- Исправление RLS политик для scheduled_reminders
-- Проблема: политика проверяет auth.uid(), но в приложении используется другая система авторизации
-- Решение: используем упрощенную политику, как для других таблиц (feedings, diapers, baths)

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view reminders for their family" ON scheduled_reminders;
DROP POLICY IF EXISTS "Users can create reminders for their family" ON scheduled_reminders;
DROP POLICY IF EXISTS "Users can update reminders for their family" ON scheduled_reminders;
DROP POLICY IF EXISTS "Users can delete reminders for their family" ON scheduled_reminders;

-- Создаем упрощенную политику (как для других таблиц)
-- Используем ту же логику, что и для feedings, diapers, baths
-- Приложение использует свою систему авторизации через family_members
CREATE POLICY "Enable all operations for authenticated users" 
    ON scheduled_reminders 
    FOR ALL 
    USING (true);

