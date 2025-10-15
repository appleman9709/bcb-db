-- Добавляем поле portion_size_ounces в таблицу family_inventory
-- для хранения размера порции смеси в унциях

-- Добавляем новое поле
ALTER TABLE family_inventory 
ADD COLUMN IF NOT EXISTS portion_size_ounces DECIMAL(4,1) DEFAULT 1.0 
CHECK (portion_size_ounces > 0 AND portion_size_ounces <= 50);

-- Добавляем комментарий к полю
COMMENT ON COLUMN family_inventory.portion_size_ounces IS 'Размер порции смеси в унциях (по умолчанию 1.0)';

-- Обновляем существующие записи, устанавливая значение по умолчанию
UPDATE family_inventory 
SET portion_size_ounces = 1.0 
WHERE portion_size_ounces IS NULL;

-- Делаем поле NOT NULL после обновления
ALTER TABLE family_inventory 
ALTER COLUMN portion_size_ounces SET NOT NULL;
