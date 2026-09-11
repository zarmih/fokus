import type { ExerciseManifest } from './contract';

/** Manifest-only catalog. Exercise engines load on demand via `loadExercise`. */
export const catalog: { manifest: ExerciseManifest }[] = [
  {
    manifest: {
      id: 'alphanumeric-sort',
      name: 'Символика',
      domain: 'flexibility',
      skills: ['rule_switching', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Сортируйте падающие символы. Если это БУКВА — жмите ВЛЕВО. Если ЧИСЛО — ВПРАВО.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'arcade-shooter',
      name: 'Космический стрелок',
      domain: 'speed',
      skills: ['reaction', 'tracking'] as unknown as ExerciseManifest['skills'],
      instruction: 'Управляйте кораблем, чтобы сбивать летящие сверху цели. Промах снижает точность!'
    }
  },
  {
    manifest: {
      id: 'arrow-swipe',
      name: 'Свайп',
      domain: 'attention',
      skills: ['inhibition', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'ЗЕЛЁНАЯ стрелка — нажимайте туда, куда она указывает. КРАСНАЯ — в ПРОТИВОПОЛОЖНУЮ сторону.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'avatar-names',
      name: 'Имена',
      domain: 'memory',
      skills: ['working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните имена персонажей. Затем, когда появится один из них, выберите его правильное имя.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'balance-scales',
      name: 'Равновесие',
      domain: 'logic',
      skills: ['logical_reasoning', 'pattern_recognition'] as ExerciseManifest['skills'],
      instruction: 'Изучите весы и определите, какая фигура тяжелее.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'catch-the-color',
      name: 'Цветолов',
      domain: 'speed',
      skills: ['reaction_speed', 'inhibition'] as ExerciseManifest['skills'],
      instruction: 'Кликайте ТОЛЬКО на объекты заданного цвета. Другие игнорируйте.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'category-sort',
      name: 'Сортировка',
      domain: 'flexibility',
      skills: ['cognitive_flexibility', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Определите категорию слова и нажмите соответствующую кнопку.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'clock-reading',
      name: 'Время',
      domain: 'logic',
      skills: ['logical_reasoning', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Если время на циферблате совпадает с цифровым — нажмите "Да". Иначе — "Нет".',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'color-burst',
      name: 'Вспышка',
      domain: 'speed',
      skills: ['reaction_speed', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Как только появится круг — нажмите на него МАКСИМАЛЬНО БЫСТРО.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'color-sequence',
      name: 'Эхо',
      domain: 'memory',
      skills: ['working_memory', 'visual_memory'] as ExerciseManifest['skills'],
      instruction: 'Запоминайте последовательность вспышек и повторяйте её.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'color-shape-switch',
      name: 'Цвет-Форма',
      domain: 'flexibility',
      skills: ['rule_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Если фон ТЁМНЫЙ — выберите совпадающую ФОРМУ. Если фон СВЕТЛЫЙ — выберите совпадающий ЦВЕТ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'color-sort',
      name: 'Сортировщик',
      domain: 'flexibility',
      skills: ['task_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Сортируйте фигуры влево или вправо по текущему ПРАВИЛУ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'context-switch',
      name: 'Хамелеон',
      domain: 'flexibility',
      skills: ['rule_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Светлый фон: выберите кнопку с ТЕМ ЖЕ ЦВЕТОМ. Тёмный фон: выберите кнопку с ТОЙ ЖЕ ФОРМОЙ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'corsi',
      name: 'Блоки Корси',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомни порядок, в котором загораются квадраты, и повтори его.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'direction-match',
      name: 'Вектор',
      domain: 'flexibility',
      skills: ['rule_switching', 'inhibition'] as ExerciseManifest['skills'],
      instruction: 'Если текст БЕЛЫЙ — нажимайте по тексту. Если текст ЖЁЛТЫЙ — нажимайте туда, куда указывает стрелка.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'direction-memory',
      name: 'Стрелки',
      domain: 'memory',
      skills: ['working_memory', 'spatial_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните последовательность направлений и повторите её.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'direction-switch',
      name: 'Стрелочник',
      domain: 'flexibility',
      skills: ['task_switching', 'inhibition'] as ExerciseManifest['skills'],
      instruction: 'Если рамка синяя — укажите, КУДА указывает стрелка. Если оранжевая — ГДЕ она находится (слева/справа).',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'dot-ratio',
      name: 'Глазомер',
      domain: 'attention',
      skills: ['visual_scanning', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Оцените "на глаз", точек какого цвета БОЛЬШЕ (Синих или Красных).',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'dot-span',
      name: 'Путь Следопыта',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните последовательность появления точек и повторите её.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'emotion-match',
      name: 'Эмоции',
      domain: 'attention',
      skills: ['selective_attention', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Если эмоция на лице совпадает с текстом — нажмите "Да". Иначе — "Нет".',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'equation-balance',
      name: 'Математические Весы',
      domain: 'logic',
      skills: ['mental_calculation', 'logical_reasoning'] as ExerciseManifest['skills'],
      instruction: 'Сделайте равенство верным, выбрав правильный математический знак.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'even-odd',
      name: 'Двойное Дно',
      domain: 'flexibility',
      skills: ['task_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Если рамка СИНЯЯ — укажите чётное или нечётное. Если ЖЁЛТАЯ — больше или меньше 5.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'expression-compare',
      name: 'Дуэль Чисел',
      domain: 'logic',
      skills: ['mental_calculation', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Сравните два выражения и выберите то, результат которого БОЛЬШЕ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'find-pair',
      name: 'Двойник',
      domain: 'attention',
      skills: ['visual_scanning', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Найдите и нажмите на любую из ДВУХ одинаковых фигур.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'flanker-task',
      name: 'Стая',
      domain: 'attention',
      skills: ['selective_attention', 'inhibition'] as ExerciseManifest['skills'],
      instruction: 'Укажите направление ЦЕНТРАЛЬНОЙ птицы (стрелки), игнорируя остальных.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'flash-cards',
      name: 'Где же он?',
      domain: 'memory',
      skills: ['visual_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните расположение карточек. Затем найдите заданную.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'focus-circle',
      name: 'Снайпер',
      domain: 'attention',
      skills: ['selective_attention', 'reaction_speed'] as ExerciseManifest['skills'],
      instruction: 'Нажмите кнопку, когда сужающийся круг точно совпадёт с кольцом-мишенью.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'go-no-go',
      name: 'Go / No-Go',
      domain: 'attention',
      skills: ['inhibition', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Нажимайте КРАСНУЮ кнопку, когда видите ЗЕЛЕНЫЙ круг. НИЧЕГО НЕ НАЖИМАЙТЕ, если круг КРАСНЫЙ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'grid-memory',
      name: 'Матрица',
      domain: 'memory',
      skills: ['visual_memory', 'spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомни подсвеченные клетки и отметь их. Порядок не важен.',
      metricModel: 'memory-span',
      diffCurve: 'warmup-plateau'
    }
  },
  {
    manifest: {
      id: 'imposter-search',
      name: 'Самозванец',
      domain: 'attention',
      skills: ['visual_scanning', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Среди множества одинаковых элементов скрывается ОДИН отличающийся. Найдите его как можно быстрее.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'location-recall',
      name: 'Позиция',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните расположение фигур в сетке. Затем укажите, где находилась заданная фигура.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'math-chains',
      name: 'Калькулятор',
      domain: 'logic',
      skills: ['mental_calculation', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Вычислите результат цепочки математических операций. ВАЖНО: операции выполняются СТРОГО СЛЕВА НАПРАВО, без приоритета умножения!',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'math-sign-switch',
      name: 'Знак Числа',
      domain: 'flexibility',
      skills: ['rule_switching', 'mental_calculation'] as ExerciseManifest['skills'],
      instruction: 'Если фон СИНИЙ — СЛОЖИТЕ числа. Если фон ОРАНЖЕВЫЙ — ВЫЧТИТЕ нижнее из верхнего.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'math-sprint',
      name: 'Арифметика',
      domain: 'speed',
      skills: ['mental_calculation', 'processing_speed', 'reaction_speed'] as ExerciseManifest['skills'],
      instruction: 'Быстро решайте, верный ли ответ в математическом примере. Нажмите "Да" или "Нет".',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'math-switch',
      name: 'Смена Знака',
      domain: 'flexibility',
      skills: ['rule_switching', 'mental_calculation'] as ExerciseManifest['skills'],
      instruction: 'СИНЯЯ рамка — СЛОЖИТЕ числа. КРАСНАЯ рамка — ВЫЧТИТЕ второе число из первого.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'mental-rotation',
      name: 'Ментальная ротация',
      domain: 'logic',
      skills: ['spatial_reasoning', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Определите, совпадают ли фигуры. Нажмите ДА, если правая фигура — это та же самая левая фигура, просто повернутая. Нажмите НЕТ, если это зеркальное отражение.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'meteorites',
      name: 'Метеориты',
      domain: 'speed',
      skills: ['processing_speed', 'selective_attention'] as ExerciseManifest['skills'],
      instruction: 'Уничтожайте ТОЛЬКО объекты нужной формы, пока они не упали.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'missing-operator',
      name: 'Знак',
      domain: 'logic',
      skills: ['mental_calculation', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Определите недостающий математический знак (+, -, ×, ÷), чтобы равенство стало верным.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'moving-targets',
      name: 'Слежение',
      domain: 'attention',
      skills: ['sustained_attention', 'divided_attention'] as ExerciseManifest['skills'],
      instruction: 'Запомните подсвеченные объекты. Когда они остановятся — укажите их.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'n-back',
      name: 'Dual N-Back',
      domain: 'memory',
      skills: ['working_memory', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Следи за фигурой на экране И за буквой, которую произносит диктор. Жми соответствующие кнопки, если фигура или буква совпадает с той, что была N шагов назад.',
      metricModel: 'speed-accuracy',
      diffCurve: 'warmup-plateau-surge'
    }
  },
  {
    manifest: {
      id: 'number-code',
      name: 'Код',
      domain: 'memory',
      skills: ['working_memory', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Запомните последовательность цифр. Затем введите её на клавиатуре.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'number-memory',
      name: 'Числовой Код',
      domain: 'memory',
      skills: ['working_memory', 'visual_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните число. После его исчезновения введите его по памяти.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'number-pyramid',
      name: 'Пирамида',
      domain: 'logic',
      skills: ['logical_reasoning', 'mental_calculation'] as ExerciseManifest['skills'],
      instruction: 'Каждый блок равен СУММЕ двух блоков под ним. Найдите число для выделенного блока.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'number-series',
      name: 'Ряд',
      domain: 'logic',
      skills: ['pattern_recognition', 'logical_reasoning'] as ExerciseManifest['skills'],
      instruction: 'Определите закономерность числового ряда и выберите пропущенное число.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'number-sort',
      name: 'Быстрая Сортировка',
      domain: 'speed',
      skills: ['processing_speed', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Кликайте по числам в порядке возрастания (от меньшего к большему).',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'odd-one',
      name: 'Лишний',
      domain: 'attention',
      skills: ['visual_scanning', 'selective_attention', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Найди элемент, который отличается от остальных.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'pairs',
      name: 'Пары',
      domain: 'memory',
      skills: ['visual_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Найди одинаковые картинки.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'parity-magnitude',
      name: 'Магнитуда',
      domain: 'flexibility',
      skills: ['rule_switching', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Если число СИНЕЕ, выберите: Чётное или Нечётное. Если число ОРАНЖЕВОЕ, выберите: Больше 50 или Меньше 50.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'path-finder',
      name: 'Лабиринт',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните скрытый путь от старта к финишу и повторите его.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'path-recall',
      name: 'Траектория',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните путь, по которому зажигаются квадраты, и повторите его.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'pattern-next',
      name: 'Ряд',
      domain: 'logic',
      skills: ['pattern_recognition', 'logical_reasoning'] as ExerciseManifest['skills'],
      instruction: 'Выбери, что идёт дальше в ряду.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'posner',
      name: 'Скрытое внимание (Posner)',
      domain: 'attention',
      skills: ['selective_attention', 'reaction_speed'] as ExerciseManifest['skills'],
      instruction: 'Следи за крестиком в центре. Когда появится круг слева или справа — жми соответствующую стрелку. Осторожно: стрелка-подсказка бывает обманчива!',
      metricModel: 'speed-accuracy',
      diffCurve: 'warmup-plateau-surge'
    }
  },
  {
    manifest: {
      id: 'pulley',
      name: 'Шкив',
      domain: 'logic',
      skills: ['logical_reasoning', 'mental_calculation', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Подвесь ровно столько, сколько нужно двери. Лишнее — канат не тянет как надо.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'rapid-sorting',
      name: 'Живое-Неживое',
      domain: 'speed',
      skills: ['reaction_speed', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Распределите объекты по категориям ЖИВОЕ (слева) или НЕЖИВОЕ (справа) как можно быстрее.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'reaction-strike',
      name: 'Перехват',
      domain: 'speed',
      skills: ['reaction_speed', 'selective_attention'] as ExerciseManifest['skills'],
      instruction: 'Нажмите кнопку ровно в тот момент, когда движущийся объект окажется в зоне перехвата.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'same-different',
      name: 'Близнецы',
      domain: 'speed',
      skills: ['processing_speed', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Определите, являются ли две фигуры АБСОЛЮТНО ОДИНАКОВЫМИ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'schulte',
      name: 'Таблицы Шульте',
      domain: 'attention',
      skills: ['visual_scanning', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Нажимай числа по порядку от 1 и далее как можно быстрее.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'sequence',
      name: 'Цепочка',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните порядок вспыхивающих клеток и повторите его.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'sequence-reverse',
      name: 'Реверс',
      domain: 'memory',
      skills: ['working_memory', 'spatial_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните последовательность и повторите её В ОБРАТНОМ ПОРЯДКЕ.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'shape-count',
      name: 'Счётчик',
      domain: 'attention',
      skills: ['visual_scanning', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Посчитайте количество УКАЗАННЫХ фигур среди всех остальных.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'shape-name',
      name: 'Ассоциации',
      domain: 'memory',
      skills: ['visual_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните вымышленные названия фигур, а затем выберите правильное имя для указанной фигуры.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'shape-position',
      name: 'Архивариус',
      domain: 'memory',
      skills: ['spatial_memory', 'visual_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните расположение фигур. Затем укажите, где находилась появившаяся фигура.',
      metricModel: 'memory-span'
    }
  },
  {
    manifest: {
      id: 'shell-game',
      name: 'Напёрстки',
      domain: 'attention',
      skills: ['sustained_attention', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Следите за шариком. После перемешивания укажите, под каким напёрстком он скрыт.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'size-compare',
      name: 'Масштаб',
      domain: 'logic',
      skills: ['logical_reasoning', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Несмотря на размер картинки на экране, выберите животное или объект, который БОЛЬШЕ В РЕАЛЬНОЙ ЖИЗНИ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'spatial-match',
      name: 'Шаблон',
      domain: 'memory',
      skills: ['spatial_memory', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Запомните узор на сетке. Затем определите, совпадает ли с ним следующий узор.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'spatial-speed',
      name: 'Радар',
      domain: 'speed',
      skills: ['visual_scanning', 'reaction_speed'] as ExerciseManifest['skills'],
      instruction: 'Уничтожайте цели до того, как они исчезнут.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'split-attention',
      name: 'Двойной Контроль',
      domain: 'attention',
      skills: ['divided_attention', 'selective_attention'] as ExerciseManifest['skills'],
      instruction: 'Следите за обеими половинами экрана. Нажимайте на объекты заданного цвета, как только они появляются.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'stroop',
      name: 'Чернила',
      domain: 'flexibility',
      skills: ['selective_attention', 'inhibition', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Нажми цвет букв, не читай слово.',
      metricModel: 'speed-accuracy',
      diffCurve: 'warmup-plateau-surge'
    }
  },
  {
    manifest: {
      id: 'swings',
      name: 'Качели',
      domain: 'speed',
      skills: ['reaction_speed', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Прыгай на перекладину. Мимо — сначала.',
      metricModel: 'timing-precision'
    }
  },
  {
    manifest: {
      id: 'switch-rule',
      name: 'Смена правила',
      domain: 'flexibility',
      skills: ['rule_switching', 'task_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Смотри на подпись. Да или нет. Правило меняется.',
      metricModel: 'speed-accuracy',
      diffCurve: 'warmup-plateau-surge'
    }
  },
  {
    manifest: {
      id: 'symbol-math',
      name: 'Тайный Шифр',
      domain: 'logic',
      skills: ['mental_calculation', 'logical_reasoning'] as ExerciseManifest['skills'],
      instruction: 'Вычислите значение символа по уравнениям и решите финальный пример.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'target-sum',
      name: 'Сумматор',
      domain: 'logic',
      skills: ['mental_calculation', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Выберите числа, сумма которых равна заданному числу.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'time-math',
      name: 'Хронометр',
      domain: 'logic',
      skills: ['logical_reasoning', 'mental_calculation'] as ExerciseManifest['skills'],
      instruction: 'Определите ИТОГОВОЕ время после прибавления или вычитания указанных часов и минут.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'unique-color',
      name: 'Одиночка',
      domain: 'attention',
      skills: ['visual_scanning', 'processing_speed'] as ExerciseManifest['skills'],
      instruction: 'Найдите квадрат, цвет которого не повторяется.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'unique-feature',
      name: 'Исключение',
      domain: 'attention',
      skills: ['selective_attention', 'visual_scanning'] as ExerciseManifest['skills'],
      instruction: 'Найдите единственную уникальную фигуру, которая не повторяется.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'verbal-fluency',
      name: 'Вербальная беглость',
      domain: 'flexibility',
      skills: ['recall', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Назовите как можно больше ЖИВОТНЫХ за отведенное время. Нажмите "Говорить" и произносите слова чётко.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'visual-search',
      name: 'Зоркий Глаз',
      domain: 'attention',
      skills: ['visual_scanning', 'selective_attention'] as ExerciseManifest['skills'],
      instruction: 'Найдите целевой символ среди множества похожих.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'vowel-consonant',
      name: 'Алфавит',
      domain: 'flexibility',
      skills: ['rule_switching', 'cognitive_flexibility'] as ExerciseManifest['skills'],
      instruction: 'Если цвет слова СИНИЙ — нажмите "Гласная". Если ОРАНЖЕВЫЙ — "Согласная", вне зависимости от буквы.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'weight-analysis',
      name: 'Тяжеловес',
      domain: 'logic',
      skills: ['logical_reasoning', 'working_memory'] as ExerciseManifest['skills'],
      instruction: 'Проанализируйте утверждения и определите самую ТЯЖЁЛУЮ или ЛЁГКУЮ фигуру.',
      metricModel: 'logic-correctness'
    }
  },
  {
    manifest: {
      id: 'word-cascade',
      name: 'Дежавю',
      domain: 'memory',
      skills: ['working_memory', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Символы появляются один за другим. Если символ уже был показан ранее в этой сессии, нажмите ПОВТОР. Иначе — НОВЫЙ.',
      metricModel: 'speed-accuracy'
    }
  },
  {
    manifest: {
      id: 'word-pairs',
      name: 'Связки',
      domain: 'memory',
      skills: ['working_memory', 'sustained_attention'] as ExerciseManifest['skills'],
      instruction: 'Запомните пары связанных объектов. Затем для предложенного объекта выберите его пару.',
      metricModel: 'speed-accuracy'
    }
  },
];

export function getManifest(id: string): ExerciseManifest | undefined {
  return catalog.find((c) => c.manifest.id === id)?.manifest;
}
