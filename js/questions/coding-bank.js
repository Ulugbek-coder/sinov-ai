// =============================================================
// Coding Problem Bank - 49 trilingual problems (May 2026 update)
// - 12 "control_loop_function" (if-else / loops / functions)
// - 12 "array_or_string" (1D / 2D arrays / strings)
// - 10 "array_or_string_hard" (multi-part array & string)
// - 15 "easy_medium_starter" (NEW May 2026 - 10 pt slot, no hints)
// All problems are trilingual: en / uz / ru.
//
// Each version picks one from each category via a codingSeed.
// The refresh feature writes per-version picks to Firestore that
// guarantee both versions get DIFFERENT problems in each slot.
// =============================================================

window.CODING_BANK = [
  {
    category: "control_loop_function",
    title_en: "Sum of Odd Numbers",
    title_uz: "Toq Sonlar Yig'indisi",
    title_ru: "Сумма нечётных чисел",
    en: [
      "Use a <code>for</code> loop to go through numbers from 1 to 50.",
      "Calculate the sum of ALL odd numbers in that range.",
      "Display the final sum.",
      "Expected output: <code>Sum of odd numbers = 625</code>",
    ],
    uz: [
      "1 dan 50 gacha sonlar bo'yicha <code>for</code> siklini ishlating.",
      "Ushbu oraliqdagi BARCHA toq sonlar yig'indisini hisoblang.",
      "Yakuniy yig'indini ko'rsating.",
      "Kutilgan natija: <code>Sum of odd numbers = 625</code>",
    ],
    ru: [
      "Используйте цикл <code>for</code>, чтобы пройти по числам от 1 до 50.",
      "Вычислите сумму ВСЕХ нечётных чисел в этом диапазоне.",
      "Выведите итоговую сумму.",
      "Ожидаемый вывод: <code>Sum of odd numbers = 625</code>",
    ],
    hints: [
      { en: "You will need a loop and a condition inside it.", uz: "Sizga sikl va uning ichida shart kerak bo'ladi.", ru: "Вам понадобится цикл и условие внутри него." },
      { en: "An odd number leaves a remainder of 1 when divided by 2 (use the <code>%</code> operator).", uz: "Toq son 2 ga bo'linganda 1 qoldiq qoldiradi (<code>%</code> operatoridan foydalaning).", ru: "Нечётное число даёт остаток 1 при делении на 2 (используйте оператор <code>%</code>)." },
      { en: "Keep a running total in a variable and add to it only when the condition is met.", uz: "O'zgaruvchida jami yig'indini saqlang va shart bajarilganda unga qo'shing.", ru: "Храните накопительную сумму в переменной и прибавляйте к ней только при выполнении условия." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int sum = 0;

    cout << "Sum of odd numbers = " << sum << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int sum = 0;

    cout << "Sum of odd numbers = " << sum << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Find Maximum of Three Numbers",
    title_uz: "Uchta Sondan Eng Kattasini Topish",
    title_ru: "Найти максимум из трёх чисел",
    en: [
      "Define a function <code>int findMax(int a, int b, int c)</code> that returns the largest of the three.",
      "In <code>main</code>, call <code>findMax(15, 42, 27)</code> and store the result.",
      "Display it.",
      "Expected output: <code>Maximum = 42</code>",
    ],
    uz: [
      "<code>int findMax(int a, int b, int c)</code> funksiyasini yarating, u uchtadan eng kattasini qaytarsin.",
      "<code>main</code> da <code>findMax(15, 42, 27)</code> ni chaqiring va natijani saqlang.",
      "Uni ko'rsating.",
      "Kutilgan natija: <code>Maximum = 42</code>",
    ],
    ru: [
      "Определите функцию <code>int findMax(int a, int b, int c)</code>, которая возвращает наибольшее из трёх.",
      "В <code>main</code> вызовите <code>findMax(15, 42, 27)</code> и сохраните результат.",
      "Выведите его.",
      "Ожидаемый вывод: <code>Maximum = 42</code>",
    ],
    hints: [
      { en: "Use two <code>if</code> statements or a ternary operator.", uz: "Ikki <code>if</code> yoki shartli operatordan foydalaning.", ru: "Внутри функции сравните a с b и сохраните больший в локальную переменную." },
      { en: "Remember to RETURN a value - not just <code>cout</code> it.", uz: "Qiymatni QAYTARISH kerak - faqat <code>cout</code> qilib qo'yish emas.", ru: "Затем сравните эту переменную с c и при необходимости обновите её." },
      { en: "The function signature is <code>int findMax(int a, int b, int c)</code>.", uz: "Funksiya imzosi: <code>int findMax(int a, int b, int c)</code>.", ru: "Верните локальную переменную с помощью <code>return</code>; <code>main</code> выведет её." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {

    cout << "Maximum = " << /* result */ 0 << endl;
    return 0;
}

`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {

    cout << "Maximum = " << /* result */ 0 << endl;
    return 0;
}

`,
  },
  {
    category: "control_loop_function",
    title_en: "Sum of Digits",
    title_uz: "Raqamlar Yig'indisi",
    title_ru: "Сумма цифр числа",
    en: [
      "Read a positive integer from the user.",
      "Use a <code>while</code> loop to compute the sum of its digits.",
      "Display the sum.",
      "Example: input <code>1234</code> -> output <code>Sum of digits = 10</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son o'qing.",
      "Uning raqamlari yig'indisini hisoblash uchun <code>while</code> siklidan foydalaning.",
      "Yig'indini ko'rsating.",
      "Misol: kirish <code>1234</code> -> natija <code>Sum of digits = 10</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Вычислите сумму его цифр с помощью цикла <code>while</code>.",
      "Выведите её.",
      "Пример: ввод <code>1234</code> -> вывод <code>Sum = 10</code>",
    ],
    hints: [
      { en: "The operation <code>n % 10</code> gives the last digit.", uz: "<code>n % 10</code> amali oxirgi raqamni beradi.", ru: "Извлекайте последнюю цифру с помощью <code>n % 10</code> и прибавляйте её к сумме." },
      { en: "The operation <code>n / 10</code> removes the last digit (integer division).", uz: "<code>n / 10</code> amali oxirgi raqamni olib tashlaydi (butun bo'lish).", ru: "После получения цифры удалите её, выполнив <code>n /= 10</code>." },
      { en: "Keep looping while <code>n > 0</code>.", uz: "<code>n > 0</code> bo'lguncha siklni davom ettiring.", ru: "Повторяйте, пока <code>n</code> не станет равно 0." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of digits = " << sum << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of digits = " << sum << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Multiplication Table",
    title_uz: "Ko'paytirish Jadvali",
    title_ru: "Таблица умножения",
    en: [
      "Read an integer <code>n</code> from the user.",
      "Use a <code>for</code> loop to print the multiplication table of <code>n</code> from 1 to 10.",
      "Each line must be formatted like <code>n x i = result</code>.",
      "Example: input <code>5</code> -> 10 lines, first is <code>5 x 1 = 5</code>, last is <code>5 x 10 = 50</code>",
    ],
    uz: [
      "Foydalanuvchidan <code>n</code> butun sonini o'qing.",
      "<code>n</code> ning 1 dan 10 gacha ko'paytirish jadvalini <code>for</code> sikli bilan chiqaring.",
      "Har bir qator <code>n x i = natija</code> ko'rinishida bo'lsin.",
      "Misol: kirish <code>5</code> -> 10 qator, birinchi <code>5 x 1 = 5</code>, oxirgi <code>5 x 10 = 50</code>",
    ],
    ru: [
      "Прочитайте число <code>n</code> от пользователя.",
      "Используйте цикл <code>for</code>, чтобы вывести таблицу умножения для <code>n</code> от 1 до 10.",
      "Каждая строка должна выглядеть так: <code>n x i = result</code>",
      "Пример: ввод <code>3</code> -> вывод <code>3 x 1 = 3</code> ... <code>3 x 10 = 30</code> (10 строк)",
    ],
    hints: [
      { en: "Loop <code>i</code> from 1 to 10 inclusive.", uz: "<code>i</code> ni 1 dan 10 gacha (qo'shib) aylantiring.", ru: "Используйте цикл <code>for</code>, в котором счётчик <code>i</code> идёт от 1 до 10." },
      { en: "Inside the loop print <code>n &lt;&lt; \" x \" &lt;&lt; i &lt;&lt; \" = \" &lt;&lt; n*i</code>.", uz: "Sikl ichida <code>n &lt;&lt; \" x \" &lt;&lt; i &lt;&lt; \" = \" &lt;&lt; n*i</code> ni chiqaring.", ru: "Внутри цикла вычислите <code>n * i</code>." },
      { en: "Don't forget <code>&lt;&lt; endl</code> after each line.", uz: "Har bir satrdan keyin <code>&lt;&lt; endl</code> ni unutmang.", ru: "Выводите результат в формате, показанном в примере, с переходом на новую строку." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a number: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a number: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Factorial of N",
    title_uz: "N ning Faktoriali",
    title_ru: "Факториал числа N",
    en: [
      "Read a non-negative integer <code>n</code> from the user.",
      "Compute <code>n!</code> (n factorial = 1 x 2 x 3 x ... x n) using a loop.",
      "Display the result.",
      "Example: input <code>5</code> -> output <code>5! = 120</code>",
    ],
    uz: [
      "Foydalanuvchidan manfiy bo'lmagan <code>n</code> butun sonini o'qing.",
      "Sikl yordamida <code>n!</code> (n faktorial = 1 x 2 x 3 x ... x n) ni hisoblang.",
      "Natijani ko'rsating.",
      "Misol: kirish <code>5</code> -> natija <code>5! = 120</code>",
    ],
    ru: [
      "Прочитайте неотрицательное целое число <code>n</code> от пользователя.",
      "Используйте цикл <code>for</code> или <code>while</code>, чтобы вычислить <code>n!</code> (факториал).",
      "Выведите результат.",
      "Пример: ввод <code>5</code> -> вывод <code>Factorial = 120</code>",
    ],
    hints: [
      { en: "Initialize your accumulator to 1 (NOT 0 - multiplying by 0 zeros it).", uz: "Akkumulyatorni 1 ga tenglang (0 emas - 0 ga ko'paytirish natijani 0 qiladi).", ru: "Начните с переменной <code>fact = 1</code>." },
      { en: "Use <code>long long</code> for the result since factorials grow fast.", uz: "Faktorial tez o'sadi, shuning uchun natija uchun <code>long long</code> turidan foydalaning.", ru: "Умножайте <code>fact</code> на каждое целое число от 1 до n включительно." },
      { en: "For n = 0, the answer is 1.", uz: "n = 0 bo'lsa, javob 1.", ru: "Не забудьте крайний случай: 0! = 1." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    long long fact = 1;

    cout << n << "! = " << fact << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    long long fact = 1;

    cout << n << "! = " << fact << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Check If Number Is Prime",
    title_uz: "Son Tub Ekanligini Tekshirish",
    title_ru: "Проверить, простое ли число",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Check if <code>n</code> is prime using a loop (try divisors from 2 up to <code>n-1</code>).",
      "Print <code>\"Prime\"</code> or <code>\"Not prime\"</code>.",
      "Example: input <code>7</code> -> output <code>Prime</code>. Input <code>9</code> -> output <code>Not prime</code>.",
    ],
    uz: [
      "Foydalanuvchidan musbat <code>n</code> butun sonini o'qing.",
      "<code>n</code> ning tub ekanligini sikl yordamida tekshiring (bo'luvchilarni 2 dan <code>n-1</code> gacha sinab ko'ring).",
      "<code>\"Prime\"</code> yoki <code>\"Not prime\"</code> ni chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>Prime</code>. Kirish <code>9</code> -> natija <code>Not prime</code>.",
    ],
    ru: [
      "Прочитайте целое число <code>n</code> от пользователя.",
      "Определите, является ли оно простым (делится только на 1 и на само себя).",
      "Выведите <code>Prime</code> или <code>Not Prime</code>.",
      "Числа меньше 2 НЕ простые. Пример: ввод <code>13</code> -> вывод <code>Prime</code>",
    ],
    hints: [
      { en: "Keep a <code>bool isPrime = true;</code> flag.", uz: "<code>bool isPrime = true;</code> bayrog'ini saqlang.", ru: "Числа меньше 2 (например, 0, 1, отрицательные) считаются НЕ простыми." },
      { en: "Inside the loop, if <code>n % i == 0</code>, set <code>isPrime = false;</code> and <code>break;</code>.", uz: "Sikl ichida <code>n % i == 0</code> bo'lsa, <code>isPrime = false;</code> qiling va <code>break;</code> bering.", ru: "Пройдите циклом по делителям от 2 до <code>n - 1</code> и проверьте, делится ли n нацело." },
      { en: "Special cases: 0 and 1 are NOT prime.", uz: "Maxsus holatlar: 0 va 1 TUB EMAS.", ru: "Если делитель найден, число составное; иначе - простое." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    bool isPrime = true;

    cout << (isPrime ? "Prime" : "Not prime") << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    bool isPrime = true;

    cout << (isPrime ? "Prime" : "Not prime") << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Count Digits of a Number",
    title_uz: "Sonning Raqamlar Sonini Topish",
    title_ru: "Подсчёт цифр числа",
    en: [
      "Read a positive integer from the user.",
      "Use a <code>while</code> loop to count how many digits it has.",
      "Display the count.",
      "Example: input <code>70235</code> -> output <code>Digit count = 5</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son o'qing.",
      "Uning nechta raqami borligini sanash uchun <code>while</code> siklidan foydalaning.",
      "Sonni ko'rsating.",
      "Misol: kirish <code>70235</code> -> natija <code>Digit count = 5</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Подсчитайте количество цифр в нём с помощью цикла <code>while</code>.",
      "Выведите количество.",
      "Пример: ввод <code>54321</code> -> вывод <code>Digits = 5</code>",
    ],
    hints: [
      { en: "Each iteration, divide the number by 10 and increment a counter.", uz: "Har bir qadamda sonni 10 ga bo'ling va hisoblagichni oshiring.", ru: "Используйте счётчик, начиная с 0." },
      { en: "Loop while <code>n > 0</code>.", uz: "<code>n > 0</code> bo'lguncha davom eting.", ru: "Увеличивайте счётчик при каждом выполнении <code>n /= 10</code>." },
      { en: "Be careful with <code>n = 0</code> - that has 1 digit.", uz: "<code>n = 0</code> ga ehtiyot bo'ling - unda 1 ta raqam bor.", ru: "Цикл должен продолжаться, пока <code>n</code> не станет 0." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    int count = 0;

    cout << "Digit count = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter a positive integer: ";
    cin >> n;

    int count = 0;

    cout << "Digit count = " << count << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Sum of Even Numbers from 1 to N",
    title_uz: "1 dan N gacha Juft Sonlar Yig'indisi",
    title_ru: "Сумма чётных чисел от 1 до N",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Use a <code>for</code> loop to compute the sum of all EVEN numbers from 1 to <code>n</code>.",
      "Display the sum.",
      "Example: input <code>10</code> -> output <code>Sum of evens = 30</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat <code>n</code> butun sonini o'qing.",
      "1 dan <code>n</code> gacha BARCHA JUFT sonlar yig'indisini <code>for</code> sikli bilan hisoblang.",
      "Yig'indini ko'rsating.",
      "Misol: kirish <code>10</code> -> natija <code>Sum of evens = 30</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Используйте цикл <code>for</code>, чтобы пройти числа от 1 до n.",
      "Накапливайте сумму ТОЛЬКО чётных чисел.",
      "Пример: ввод <code>10</code> -> вывод <code>Sum of evens = 30</code>",
    ],
    hints: [
      { en: "An even number has remainder 0 when divided by 2.", uz: "Juft son 2 ga bo'linganda qoldig'i 0 bo'ladi.", ru: "Чётное число удовлетворяет условию <code>i % 2 == 0</code>." },
      { en: "You can loop <code>i</code> from 1 to n and check <code>if (i % 2 == 0)</code>.", uz: "<code>i</code> ni 1 dan n gacha aylantirib, <code>if (i % 2 == 0)</code> ni tekshirishingiz mumkin.", ru: "Используйте оператор <code>if</code> внутри цикла, чтобы прибавлять только чётные числа." },
      { en: "Accumulate into a single variable.", uz: "Bitta o'zgaruvchida jamlang.", ru: "Выведите итоговую сумму после цикла." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of evens = " << sum << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of evens = " << sum << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Fibonacci First N Terms",
    title_uz: "Fibonachchi Birinchi N Hadi",
    title_ru: "Первые N членов последовательности Фибоначчи",
    en: [
      "Read a positive integer <code>n</code> (n >= 2) from the user.",
      "Print the first <code>n</code> terms of the Fibonacci sequence, space-separated, starting with 0 1.",
      "Example: input <code>7</code> -> output <code>0 1 1 2 3 5 8</code>",
      "Use a loop. Do NOT use recursion.",
    ],
    uz: [
      "Foydalanuvchidan musbat <code>n</code> butun sonini (n >= 2) o'qing.",
      "Fibonachchi ketma-ketligining birinchi <code>n</code> ta hadi 0 1 dan boshlab, bo'sh joy bilan ajratilgan holda chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>0 1 1 2 3 5 8</code>",
      "Sikldan foydalaning. Rekursiya ishlatmang.",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Выведите первые <code>n</code> чисел Фибоначчи через пробел.",
      "Последовательность начинается с 0 и 1.",
      "Пример: ввод <code>7</code> -> вывод <code>0 1 1 2 3 5 8</code>",
    ],
    hints: [
      { en: "Keep two variables <code>a = 0, b = 1</code> for the two previous terms.", uz: "Oldingi ikki had uchun <code>a = 0, b = 1</code> o'zgaruvchilarini saqlang.", ru: "Сохраняйте ДВА предыдущих числа в переменных, например <code>a = 0</code> и <code>b = 1</code>." },
      { en: "Print <code>a</code>, then compute <code>next = a + b</code>, shift <code>a = b; b = next;</code>.", uz: "<code>a</code> ni chiqaring, keyin <code>next = a + b</code> ni hisoblang, <code>a = b; b = next;</code> qiling.", ru: "На каждой итерации выводите <code>a</code>, затем обновляйте: <code>next = a + b</code>, <code>a = b</code>, <code>b = next</code>." },
      { en: "Print exactly <code>n</code> numbers.", uz: "Aniq <code>n</code> ta sonni chiqaring.", ru: "Используйте цикл <code>for</code> на <code>n</code> итераций. Учитывайте крайние случаи n=1 и n=2." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int a = 0, b = 1;

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int a = 0, b = 1;

    cout << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Celsius to Fahrenheit Converter",
    title_uz: "Selsiy dan Farengeytga O'tkazgich",
    title_ru: "Конвертер Цельсия в Фаренгейт",
    en: [
      "Define a function <code>double toFahrenheit(double c)</code> that returns <code>c * 9.0 / 5.0 + 32.0</code>.",
      "In <code>main</code>, read a temperature in Celsius from the user, call the function, and print the result.",
      "Example: input <code>25</code> -> output <code>77</code>",
    ],
    uz: [
      "<code>double toFahrenheit(double c)</code> funksiyasini yarating, u <code>c * 9.0 / 5.0 + 32.0</code> ni qaytaradigan qilib.",
      "<code>main</code> da foydalanuvchidan Selsiydagi haroratni o'qing, funksiyani chaqiring va natijani chop eting.",
      "Misol: kirish <code>25</code> -> natija <code>77</code>",
    ],
    ru: [
      "Определите функцию <code>double cToF(double c)</code>, которая возвращает <code>c * 9/5 + 32</code>.",
      "В <code>main</code> прочитайте температуру в градусах Цельсия от пользователя.",
      "Вызовите функцию и выведите результат. Пример: ввод <code>100</code> -> вывод <code>Fahrenheit = 212</code>",
    ],
    hints: [
      { en: "Use <code>double</code>, not <code>int</code>, so the decimals aren't lost.", uz: "Kasr qismi yo'qolmasligi uchun <code>int</code> emas, <code>double</code> dan foydalaning.", ru: "Не забудьте использовать <code>double</code> для дробных значений." },
      { en: "Remember: function must RETURN the converted value.", uz: "Esda tuting: funksiya o'zgartirilgan qiymatni QAYTARISHI kerak.", ru: "Будьте внимательны: <code>9/5</code> в целочисленной арифметике даёт 1; используйте <code>9.0/5</code> или <code>9.0/5.0</code>." },
      { en: "Call the function with the input value and print what it returns.", uz: "Funksiyani kirish qiymati bilan chaqiring va qaytgan qiymatni chop eting.", ru: "Возвращайте значение из функции и выводите его в <code>main</code>." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    double c;
    cout << "Enter temperature in Celsius: ";
    cin >> c;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    double c;
    cout << "Enter temperature in Celsius: ";
    cin >> c;

    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "GCD of Two Numbers",
    title_uz: "Ikki Sonning EKUB i",
    title_ru: "НОД двух чисел",
    en: [
      "Read two positive integers <code>a</code> and <code>b</code>.",
      "Compute their Greatest Common Divisor using a <code>while</code> loop.",
      "Display the GCD.",
      "Example: input <code>12 18</code> -> output <code>GCD = 6</code>",
    ],
    uz: [
      "Ikki musbat butun son <code>a</code> va <code>b</code> ni o'qing.",
      "Ularning eng katta umumiy bo'luvchisini (EKUB) <code>while</code> sikli bilan toping.",
      "EKUB ni ko'rsating.",
      "Misol: kirish <code>12 18</code> -> natija <code>GCD = 6</code>",
    ],
    ru: [
      "Определите функцию <code>int gcd(int a, int b)</code>, которая возвращает наибольший общий делитель.",
      "В <code>main</code> прочитайте два положительных целых числа от пользователя.",
      "Вызовите <code>gcd</code> и выведите результат.",
      "Пример: ввод <code>48 18</code> -> вывод <code>GCD = 6</code>",
    ],
    hints: [
      { en: "Use Euclid's algorithm: while <code>b != 0</code>, set <code>t = b; b = a % b; a = t;</code>.", uz: "Evklid algoritmi: <code>b != 0</code> bo'lguncha, <code>t = b; b = a % b; a = t;</code> qiling.", ru: "Алгоритм Евклида: пока <code>b != 0</code>, заменяйте (a, b) на (b, a % b)." },
      { en: "When the loop ends, <code>a</code> holds the GCD.", uz: "Sikl tugagach, <code>a</code> EKUB ni saqlaydi.", ru: "Когда <code>b</code> становится 0, ответ - это <code>a</code>." },
      { en: "Remember to use <code>%</code> (modulo), not division.", uz: "<code>%</code> (modulo) dan foydalaning, bo'lish emas.", ru: "Можно реализовать циклом <code>while</code> или с помощью рекурсии." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "Enter two positive integers: ";
    cin >> a >> b;

    cout << "GCD = " << a << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "Enter two positive integers: ";
    cin >> a >> b;

    cout << "GCD = " << a << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Power Function",
    title_uz: "Daraja Funksiyasi",
    title_ru: "Функция возведения в степень",
    en: [
      "Define a function <code>int power(int base, int exp)</code> that returns <code>base^exp</code> using a loop (NOT the built-in <code>pow</code>).",
      "In <code>main</code>, call <code>power(3, 4)</code> and print the result.",
      "Assume <code>exp &ge; 0</code>.",
      "Example: <code>power(3, 4) = 81</code>",
    ],
    uz: [
      "<code>int power(int base, int exp)</code> funksiyasini yarating, u <code>base^exp</code> ni sikl yordamida qaytarsin (ichki <code>pow</code> ni ishlatmang).",
      "<code>main</code> da <code>power(3, 4)</code> ni chaqiring va natijani chop eting.",
      "<code>exp &ge; 0</code> deb faraz qiling.",
      "Misol: <code>power(3, 4) = 81</code>",
    ],
    ru: [
      "Определите функцию <code>int power(int base, int exp)</code>, которая возвращает <code>base</code> в степени <code>exp</code>.",
      "Используйте цикл (НЕ <code>pow()</code>).",
      "В <code>main</code> прочитайте основание и показатель степени от пользователя, вызовите функцию, выведите результат.",
      "Пример: ввод <code>2 10</code> -> вывод <code>Result = 1024</code>",
    ],
    hints: [
      { en: "Start with <code>result = 1</code>, then multiply by <code>base</code> inside the loop <code>exp</code> times.", uz: "<code>result = 1</code> dan boshlang va siklda <code>base</code> ga <code>exp</code> marta ko'paytiring.", ru: "Начните с <code>result = 1</code>." },
      { en: "When <code>exp = 0</code>, the result is 1 (anything to the zero power is 1).", uz: "<code>exp = 0</code> bo'lsa, natija 1 (har qanday sonning 0 ga darajasi 1).", ru: "Умножайте <code>result</code> на <code>base</code> в цикле, который выполняется <code>exp</code> раз." },
      { en: "Don't forget the <code>return</code> statement.", uz: "<code>return</code> operatorini unutmang.", ru: "Возвращайте <code>result</code> из функции и выводите её в <code>main</code>." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {

    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Reverse an Array",
    title_uz: "Massivni Teskari Chop Etish",
    title_ru: "Перевернуть массив",
    en: [
      "Declare an integer array of size 6.",
      "Read 6 numbers from the user into the array.",
      "Print the array elements in REVERSE order (from last to first).",
      "Example: input <code>1 2 3 4 5 6</code> -> output <code>6 5 4 3 2 1</code>",
    ],
    uz: [
      "6 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 6 ta sonni massivga o'qing.",
      "Massiv elementlarini TESKARI tartibda chop eting (oxirgidan birinchigacha).",
      "Misol: kirish <code>1 2 3 4 5 6</code> -> natija <code>6 5 4 3 2 1</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 6: <code>{10, 20, 30, 40, 50, 60}</code>.",
      "Используйте цикл <code>for</code>, чтобы вывести его элементы в ОБРАТНОМ порядке через пробел.",
      "<b>НЕ</b> модифицируйте массив - просто выводите с конца к началу.",
      "Ожидаемый вывод: <code>60 50 40 30 20 10</code>",
    ],
    hints: [
      { en: "Use one <code>for</code> loop to read 6 values, and another to print in reverse.", uz: "6 ta qiymatni o'qish uchun bitta <code>for</code> sikli, teskari chop etish uchun boshqasini ishlating.", ru: "Запустите цикл с индексом <code>i</code> с конца массива (от размер - 1) до 0." },
      { en: "Array indexes go from 0 to size - 1. The last element is at index 5.", uz: "Massiv indekslari 0 dan size-1 gacha. Oxirgi element 5 indeksida.", ru: "Для уменьшения <code>i</code> используйте <code>i--</code> в цикле <code>for</code>." },
      { en: "For reverse iteration, decrement the counter: <code>i--</code>.", uz: "Teskari takrorlash uchun hisoblagichni kamaytiring: <code>i--</code>.", ru: "Выводите <code>arr[i]</code> с пробелом после каждого числа." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Reversed: ";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Reversed: ";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Count Uppercase Letters",
    title_uz: "Katta Harflarni Sanash",
    title_ru: "Подсчёт заглавных букв",
    en: [
      "Ask the user to enter a word (no spaces).",
      "Use a <code>for</code> loop to go through each character.",
      "Count how many characters are UPPERCASE letters (A to Z).",
    ],
    uz: [
      "Foydalanuvchidan so'z kiritishni so'rang (bo'shliqsiz).",
      "Har bir belgidan o'tish uchun <code>for</code> siklidan foydalaning.",
      "Qancha belgi KATTA harf (A dan Z gacha) ekanligini sanang.",
    ],
    ru: [
      "Прочитайте одну строку <code>line</code> от пользователя с помощью <code>getline(cin, line)</code>.",
      "Подсчитайте, сколько в ней ЗАГЛАВНЫХ букв (от <code>'A'</code> до <code>'Z'</code>).",
      "Выведите количество. Пример: ввод <code>Hello World</code> -> вывод <code>Uppercase = 2</code>",
    ],
    hints: [
      { en: "You can check if a character is uppercase using the ASCII range: <code>c >= 'A' && c <= 'Z'</code>.", uz: "Belgining katta harfligini ASCII oraliq orqali tekshirishingiz mumkin: <code>c >= 'A' && c <= 'Z'</code>.", ru: "Пройдите циклом по строке: <code>for (int i = 0; i &lt; line.length(); i++)</code>." },
      { en: "Use <code>s.length()</code> to get the number of characters in the string.", uz: "Satrdagi belgilar sonini olish uchun <code>s.length()</code> ishlating.", ru: "Проверьте: <code>line[i] >= 'A' && line[i] &lt;= 'Z'</code>." },
      { en: "Keep a counter variable; increment it only when the condition is true.", uz: "Hisoblagich o'zgaruvchi saqlang; shart to'g'ri bo'lganda uni oshiring.", ru: "Увеличивайте счётчик при выполнении условия и выведите его в конце." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a word: ";
    cin >> word;

    int count = 0;

    cout << "Uppercase: " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a word: ";
    cin >> word;

    int count = 0;

    cout << "Uppercase: " << count << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Average of Array",
    title_uz: "Massiv O'rtachasi",
    title_ru: "Среднее значение массива",
    en: [
      "Declare an integer array of size 5.",
      "Read 5 numbers from the user.",
      "Compute the average (as a <code>double</code>) and display it.",
      "Example: input <code>10 20 30 40 50</code> -> output <code>Average = 30</code>",
    ],
    uz: [
      "5 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 5 ta sonni o'qing.",
      "O'rtachasini (<code>double</code> sifatida) hisoblab, ko'rsating.",
      "Misol: kirish <code>10 20 30 40 50</code> -> natija <code>Average = 30</code>",
    ],
    ru: [
      "Объявите массив <code>double</code> размера 5 со значениями <code>{4.5, 8.0, 6.5, 9.0, 7.5}</code>.",
      "Вычислите среднее значение всех элементов.",
      "Выведите среднее с одним десятичным знаком (вы можете просто использовать обычный cout).",
      "Ожидаемый вывод: <code>Average = 7.1</code>",
    ],
    hints: [
      { en: "Sum all elements in a loop, then divide by 5.", uz: "Barcha elementlarni sikl ichida qo'shing, keyin 5 ga bo'ling.", ru: "Накопите сумму всех элементов в цикле." },
      { en: "Cast one side of the division to <code>double</code> so you don't lose decimals.", uz: "Kasr qismi yo'qolmasligi uchun bo'lishning bir tomonini <code>double</code> ga o'tkazing.", ru: "Разделите сумму на размер массива (используйте 5.0 для деления с плавающей точкой)." },
      { en: "Store the running total in a variable of type <code>int</code> or <code>double</code>.", uz: "Jamlanuvchi yig'indini <code>int</code> yoki <code>double</code> turidagi o'zgaruvchida saqlang.", ru: "Выведите среднее: для одного знака после запятой можно использовать <code>fixed</code> и <code>setprecision(1)</code> из <code>&lt;iomanip&gt;</code>." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[5];

    cout << "Enter 5 numbers: ";

    cout << "Average = " << 0.0 /* replace with your computed average */ << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[5];

    cout << "Enter 5 numbers: ";

    cout << "Average = " << 0.0 /* replace with your computed average */ << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Count Vowels in a Word",
    title_uz: "So'zdagi Unlilarni Sanash",
    title_ru: "Подсчёт гласных в слове",
    en: [
      "Ask the user to enter a lowercase word (no spaces).",
      "Use a <code>for</code> loop to go through each character.",
      "Count how many characters are vowels (a, e, i, o, u).",
    ],
    uz: [
      "Foydalanuvchidan kichik harflar bilan yozilgan so'zni so'rang (bo'shliqsiz).",
      "Har bir belgi bo'ylab <code>for</code> siklini yuring.",
      "Qancha belgi unli (a, e, i, o, u) ekanligini sanang.",
    ],
    ru: [
      "Прочитайте одно слово <code>word</code> от пользователя через <code>cin</code>.",
      "Подсчитайте количество гласных (a, e, i, o, u - нижний регистр).",
      "Выведите количество. Пример: ввод <code>programming</code> -> вывод <code>Vowels = 3</code>",
    ],
    hints: [
      { en: "Check each character: <code>c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u'</code>.", uz: "Har bir belgini tekshiring: <code>c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u'</code>.", ru: "Используйте цикл <code>for</code>, чтобы пройти каждый символ строки." },
      { en: "Use <code>s.length()</code> as the loop bound.", uz: "Sikl chegarasi sifatida <code>s.length()</code> ishlating.", ru: "Сравнивайте каждый символ с 'a', 'e', 'i', 'o', 'u'." },
      { en: "Access characters as <code>s[i]</code>.", uz: "Belgilarga <code>s[i]</code> orqali kiring.", ru: "Увеличивайте счётчик при совпадении и выведите итог в конце." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a word: ";
    cin >> word;

    int count = 0;

    cout << "Vowels: " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a word: ";
    cin >> word;

    int count = 0;

    cout << "Vowels: " << count << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Find Minimum in Array",
    title_uz: "Massivda Eng Kichik Sonni Topish",
    title_ru: "Найти минимум в массиве",
    en: [
      "Declare an integer array of size 6.",
      "Read 6 numbers from the user.",
      "Use a <code>for</code> loop to find the minimum value.",
      "Display it. Example: input <code>12 5 8 3 15 7</code> -> output <code>Minimum = 3</code>",
    ],
    uz: [
      "6 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 6 ta sonni o'qing.",
      "Eng kichik qiymatni topish uchun <code>for</code> siklidan foydalaning.",
      "Uni chiqaring. Misol: kirish <code>12 5 8 3 15 7</code> -> natija <code>Minimum = 3</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 7: <code>{14, 3, 27, 8, 19, 5, 22}</code>.",
      "Найдите наименьшее значение с помощью цикла.",
      "Выведите его.",
      "Ожидаемый вывод: <code>Minimum = 3</code>",
    ],
    hints: [
      { en: "Initialize <code>min</code> to the FIRST element of the array (not 0).", uz: "<code>min</code> ni BIRINCHI elementga tenglang (0 emas).", ru: "Сохраните первый элемент в переменной <code>min</code>." },
      { en: "Loop from index 1 to size - 1 and update <code>min</code> when you see a smaller value.", uz: "1 dan size-1 gacha yurib, kichikroq qiymat ko'rsangiz <code>min</code> ni yangilang.", ru: "Пройдите циклом по остальным элементам; если элемент меньше <code>min</code>, обновите её." },
      { en: "Don't use <code>INT_MIN</code> - it's the wrong direction.", uz: "<code>INT_MIN</code> dan foydalanmang - noto'g'ri tomon.", ru: "Выведите <code>min</code> после цикла." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    int min = arr[0];

    cout << "Minimum = " << min << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    int min = arr[0];

    cout << "Minimum = " << min << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Count Occurrences in Array",
    title_uz: "Massivda Takrorlanishlarni Sanash",
    title_ru: "Подсчёт вхождений в массиве",
    en: [
      "Declare an integer array of size 8 with values <code>{4, 7, 4, 2, 4, 9, 1, 4}</code>.",
      "Read a target number <code>t</code> from the user.",
      "Use a loop to count how many times <code>t</code> appears in the array.",
      "Display the count. Example: input <code>4</code> -> output <code>Occurrences = 4</code>",
    ],
    uz: [
      "<code>{4, 7, 4, 2, 4, 9, 1, 4}</code> qiymatlari bilan 8 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan <code>t</code> nishon sonini o'qing.",
      "<code>t</code> ning massivda necha marta uchrashini sikl bilan sanang.",
      "Sonni chiqaring. Misol: kirish <code>4</code> -> natija <code>Occurrences = 4</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8: <code>{2, 5, 2, 7, 2, 3, 5, 2}</code>.",
      "Прочитайте число <code>target</code> от пользователя.",
      "Подсчитайте, сколько раз <code>target</code> встречается в массиве.",
      "Пример: ввод <code>2</code> -> вывод <code>Count = 4</code>",
    ],
    hints: [
      { en: "Initialize a counter to 0.", uz: "Hisoblagichni 0 ga tenglang.", ru: "Пройдите циклом по массиву, индекс от 0 до 7." },
      { en: "Inside the loop, compare each element to <code>t</code>.", uz: "Sikl ichida har bir elementni <code>t</code> bilan taqqoslang.", ru: "Сравнивайте каждый элемент с <code>target</code>." },
      { en: "Increment the counter only when they match.", uz: "Mos kelganda gina hisoblagichni oshiring.", ru: "Если совпадает - увеличивайте счётчик. Выведите итог после цикла." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8] = {4, 7, 4, 2, 4, 9, 1, 4};

    int t;
    cout << "Enter target: ";
    cin >> t;

    int count = 0;

    cout << "Occurrences = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8] = {4, 7, 4, 2, 4, 9, 1, 4};

    int t;
    cout << "Enter target: ";
    cin >> t;

    int count = 0;

    cout << "Occurrences = " << count << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Reverse a String",
    title_uz: "Satrni Teskari Chiqarish",
    title_ru: "Перевернуть строку",
    en: [
      "Ask the user to enter a word (no spaces).",
      "Use a <code>for</code> loop to print the string from LAST to FIRST character.",
      "Do not use the built-in <code>reverse</code> function.",
      "Example: input <code>hello</code> -> output <code>olleh</code>",
    ],
    uz: [
      "Foydalanuvchidan so'z kiritishni so'rang (bo'shliqsiz).",
      "<code>for</code> sikli bilan satrni OXIRGI belgidan BIRINCHI ga qadar chop eting.",
      "Ichki <code>reverse</code> funksiyasidan foydalanmang.",
      "Misol: kirish <code>hello</code> -> natija <code>olleh</code>",
    ],
    ru: [
      "Прочитайте строку <code>word</code> через <code>cin</code>.",
      "Используйте цикл <code>for</code>, чтобы вывести её символы в ОБРАТНОМ порядке (без пробелов).",
      "<b>НЕ</b> используйте функцию <code>reverse</code>.",
      "Пример: ввод <code>Hello</code> -> вывод <code>Reversed = olleH</code>",
    ],
    hints: [
      { en: "Start loop counter at <code>s.length() - 1</code>.", uz: "Sikl hisoblagichini <code>s.length() - 1</code> dan boshlang.", ru: "Получите длину: <code>word.length()</code>." },
      { en: "Decrement to 0 (inclusive).", uz: "0 gacha (qo'shib) kamaytiring.", ru: "Используйте цикл с индексом <code>i</code> от <code>длина - 1</code> до 0." },
      { en: "Print each <code>s[i]</code> without newlines between chars.", uz: "Har bir <code>s[i]</code> ni chop eting, belgilar orasiga yangi satr qo'ymang.", ru: "Выводите <code>word[i]</code> на каждой итерации." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Palindrome String Check",
    title_uz: "Palindrom Satrni Tekshirish",
    title_ru: "Проверка строки на палиндром",
    en: [
      "Ask the user to enter a word (no spaces).",
      "Check whether it reads the same forwards and backwards.",
    ],
    uz: [
      "Foydalanuvchidan so'z kiritishni so'rang (bo'shliqsiz).",
      "Uning oldinga va orqaga bir xil o'qilishini tekshiring.",
    ],
    ru: [
      "Прочитайте строку <code>word</code> через <code>cin</code>.",
      "Определите, является ли она палиндромом (читается одинаково в обе стороны). Выведите <code>Yes</code> или <code>No</code>. Пример: ввод <code>level</code> -> вывод <code>Yes</code>",
    ],
    hints: [
      { en: "Compare <code>s[i]</code> with <code>s[s.length()-1-i]</code> in a loop.", uz: "<code>s[i]</code> ni <code>s[s.length()-1-i]</code> bilan sikl ichida taqqoslang.", ru: "Сравните первый и последний символ, затем второй и предпоследний и так далее." },
      { en: "You only need to loop up to <code>s.length()/2</code>.", uz: "<code>s.length()/2</code> gacha yurish kifoya.", ru: "Достаточно проверить только первую половину строки." },
      { en: "If ANY pair doesn't match, it's not a palindrome - break early.", uz: "Agar BIRORTA juftlik mos kelmasa, palindrom emas - oldindan break qiling.", ru: "Если все пары совпадают - палиндром, иначе нет." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    bool isPalin = true;

    cout << (isPalin ? "Palindrome" : "Not palindrome") << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    bool isPalin = true;

    cout << (isPalin ? "Palindrome" : "Not palindrome") << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Count Words in a Sentence",
    title_uz: "Gapdagi So'zlarni Sanash",
    title_ru: "Подсчёт слов в предложении",
    en: [
      "Read a full line from the user with <code>getline(cin, line)</code>.",
      "Count the number of words (separated by single spaces).",
      "Display the count.",
    ],
    uz: [
      "Foydalanuvchidan <code>getline(cin, line)</code> bilan to'liq qatorni o'qing.",
      "So'zlar sonini (yakka bo'shliq bilan ajratilgan) sanang.",
      "Sonni ko'rsating.",
    ],
    ru: [
      "Прочитайте полную строку с помощью <code>getline(cin, sentence)</code>.",
      "Подсчитайте количество слов в ней (слова разделены одиночными пробелами).",
      "Выведите количество. Пример: ввод <code>I love programming a lot</code> -> вывод <code>Words = 5</code>",
    ],
    hints: [
      { en: "Count the number of spaces, then add 1 (assuming no trailing/leading spaces and single spaces between words).", uz: "Bo'shliqlar sonini sanang, keyin 1 qo'shing (oxirida/boshida bo'shliqsiz, so'zlar orasida bir bo'shliq deb faraz qiling).", ru: "Количество слов = количество пробелов + 1 (для непустой строки)." },
      { en: "Loop through the string and check each character for <code>' '</code>.", uz: "Satr bo'ylab yurib, har bir belgi <code>' '</code> ekanligini tekshiring.", ru: "Пройдите циклом по строке и считайте символы пробела." },
      { en: "Special case: an empty string has 0 words.", uz: "Maxsus holat: bo'sh satrda 0 ta so'z.", ru: "Будьте внимательны с пустой строкой как крайним случаем." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string line;
    cout << "Enter a sentence: ";
    getline(cin, line);

    int count = 0;

    cout << "Word count = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string line;
    cout << "Enter a sentence: ";
    getline(cin, line);

    int count = 0;

    cout << "Word count = " << count << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Find Second Largest",
    title_uz: "Ikkinchi Eng Katta Sonni Topish",
    title_ru: "Найти второй по величине элемент",
    en: [
      "Declare an integer array of size 6.",
      "Read 6 distinct numbers from the user.",
      "Find the SECOND largest value in the array.",
      "Display it. Example: input <code>3 8 5 12 2 10</code> -> output <code>Second largest = 10</code>",
    ],
    uz: [
      "6 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 6 ta turli sonni o'qing.",
      "Massivdagi IKKINCHI eng katta qiymatni toping.",
      "Uni ko'rsating. Misol: kirish <code>3 8 5 12 2 10</code> -> natija <code>Second largest = 10</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8: <code>{14, 22, 7, 19, 22, 31, 8, 11}</code>.",
      "Найдите ВТОРОЙ по величине УНИКАЛЬНЫЙ элемент (т.е. первый максимум - 31, второй - 22).",
      "Выведите его.",
      "Ожидаемый вывод: <code>Second largest = 22</code>",
    ],
    hints: [
      { en: "Track two variables: <code>largest</code> and <code>second</code>.", uz: "Ikki o'zgaruvchini kuzatib boring: <code>largest</code> va <code>second</code>.", ru: "Используйте две переменные: <code>max1</code> (наибольший) и <code>max2</code> (второй)." },
      { en: "When you find a new largest, the OLD largest becomes the new second.", uz: "Yangi eng kattani topsangiz, ESKI eng katta yangi ikkinchi bo'ladi.", ru: "Инициализируйте оба самым маленьким значением." },
      { en: "When a value is between <code>second</code> and <code>largest</code>, update ONLY <code>second</code>.", uz: "Qiymat <code>second</code> va <code>largest</code> oralig'ida bo'lsa, FAQAT <code>second</code> ni yangilang.", ru: "При обходе обновляйте обе при необходимости - следите, чтобы дубликат самого большого не записался во второй." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Second largest = " << 0 /* replace */ << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Second largest = " << 0 /* replace */ << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Uppercase a String",
    title_uz: "Satrni Katta Harflarga O'tkazish",
    title_ru: "Преобразовать строку в верхний регистр",
    en: [
      "Ask the user to enter a word (no spaces, all lowercase).",
      "Use a <code>for</code> loop to convert every lowercase letter to uppercase.",
      "Print the resulting string.",
    ],
    uz: [
      "Foydalanuvchidan so'z kiritishni so'rang (bo'shliqsiz, barcha kichik harflar bilan).",
      "Har bir kichik harfni katta harfga o'tkazish uchun <code>for</code> siklidan foydalaning.",
      "Natijaviy satrni chop eting.",
    ],
    ru: [
      "Прочитайте одно слово <code>word</code> через <code>cin</code>.",
      "Преобразуйте все строчные буквы (a-z) в заглавные (A-Z).",
      "Выведите преобразованную строку. Пример: ввод <code>HelloWorld</code> -> вывод <code>HELLOWORLD</code>",
    ],
    hints: [
      { en: "To convert a lowercase letter to uppercase, subtract 32: <code>s[i] = s[i] - 32;</code>.", uz: "Kichik harfni katta harfga o'tkazish uchun 32 ni ayiring: <code>s[i] = s[i] - 32;</code>.", ru: "Пройдите циклом каждый символ." },
      { en: "Or use <code>toupper(s[i])</code> from <code>&lt;cctype&gt;</code>.", uz: "Yoki <code>&lt;cctype&gt;</code> dan <code>toupper(s[i])</code> ni ishlating.", ru: "Если символ в диапазоне 'a'..'z', вычтите 32 (или используйте <code>toupper(c)</code>)." },
      { en: "Modify the characters in-place, then print the whole string once.", uz: "Belgilarni joyida o'zgartiring, keyin butun satrni bir marta chop eting.", ru: "Сохраняйте обратно в строку и выведите её в конце." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a lowercase word: ";
    cin >> s;

    cout << s << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a lowercase word: ";
    cin >> s;

    cout << s << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string",
    title_en: "Largest vs Smallest Difference",
    title_uz: "Eng Katta va Eng Kichik Sonning Farqi",
    title_ru: "Разница между наибольшим и наименьшим",
    en: [
      "Declare an integer array of size 6.",
      "Read 6 numbers from the user.",
      "Find the LARGEST and SMALLEST values in the array.",
      "Compute their DIFFERENCE (largest - smallest).",
      "Display the difference.",
      "Example: input <code>14 3 22 7 18 9</code> -> output <code>Difference = 19</code>",
    ],
    uz: [
      "6 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 6 ta sonni o'qing.",
      "Massivdagi ENG KATTA va ENG KICHIK qiymatlarni toping.",
      "Ularning FARQINI hisoblang (katta - kichik).",
      "Farqni chiqaring.",
      "Misol: kirish <code>14 3 22 7 18 9</code> -> natija <code>Difference = 19</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 6.",
      "Прочитайте 6 чисел от пользователя.",
      "Найдите НАИБОЛЬШЕЕ и НАИМЕНЬШЕЕ значения в массиве.",
      "Вычислите их РАЗНОСТЬ (наибольшее - наименьшее).",
      "Выведите разность.",
      "Пример: ввод <code>14 3 22 7 18 9</code> -> вывод <code>Difference = 19</code>",
    ],
    hints: [
      { en: "Start both <code>maxVal</code> and <code>minVal</code> with <code>arr[0]</code>.", uz: "<code>maxVal</code> va <code>minVal</code> ni <code>arr[0]</code> bilan boshlang.", ru: "Инициализируйте <code>maxVal</code> и <code>minVal</code> значением <code>arr[0]</code>." },
      { en: "Loop from i=1 to 5 and update both when needed.", uz: "i=1 dan 5 gacha siklni yuriting va kerak bo'lganda ikkalasini yangilang.", ru: "Пройдите циклом от i=1 до 5 и при необходимости обновляйте оба значения." },
      { en: "Final answer is <code>maxVal - minVal</code>.", uz: "Yakuniy javob <code>maxVal - minVal</code>.", ru: "Итоговый ответ - <code>maxVal - minVal</code>." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    int maxVal = arr[0];
    int minVal = arr[0];

    cout << "Difference = " << (maxVal - minVal) << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    int maxVal = arr[0];
    int minVal = arr[0];

    cout << "Difference = " << (maxVal - minVal) << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Min and Max of an Array",
    title_uz: "Massivning Eng Kichik va Eng Kattasini Topish",
    title_ru: "Минимум и максимум массива",
    en: [
      "Declare an integer array of size 8.",
      "Read 8 numbers from the user.",
      "<b>(a)</b> Find the MINIMUM value and print it.",
      "<b>(b)</b> Find the MAXIMUM value and print it.",
      "Example: input <code>4 12 7 3 15 9 22 6</code> -> output <code>Min = 3</code> and <code>Max = 22</code>",
    ],
    uz: [
      "8 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 8 ta sonni o'qing.",
      "<b>(a)</b> Eng KICHIK qiymatni toping va chiqaring.",
      "<b>(b)</b> Eng KATTA qiymatni toping va chiqaring.",
      "Misol: kirish <code>4 12 7 3 15 9 22 6</code> -> natija <code>Min = 3</code> va <code>Max = 22</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8.",
      "Прочитайте 8 чисел от пользователя.",
      "<b>(а)</b> Найдите МИНИМАЛЬНОЕ значение и выведите его.",
      "<b>(б)</b> Найдите МАКСИМАЛЬНОЕ значение и выведите его.",
      "Пример: ввод <code>4 12 7 3 15 9 22 6</code> -> вывод <code>Min = 3</code> и <code>Max = 22</code>",
    ],
    hints: [
      { en: "Initialize BOTH <code>min</code> and <code>max</code> to the first element.", uz: "HAM <code>min</code> ni, HAM <code>max</code> ni birinchi elementga tenglang.", ru: "Инициализируйте ОБЕ переменные (<code>min</code> и <code>max</code>) первым элементом." },
      { en: "Walk the array once; update min when you see a smaller value, update max when you see a larger one.", uz: "Massiv bo'ylab bir marta yurib, kichikroq ko'rsangiz min ni, kattaroq ko'rsangiz max ni yangilang.", ru: "Пройдите по массиву один раз; обновляйте <code>min</code> при меньшем значении и <code>max</code> при большем." },
      { en: "One loop can handle both - no need for two passes.", uz: "Bitta sikl ikkalasini ham hal qiladi - ikki marta o'tish shart emas.", ru: "Одного цикла достаточно для обоих - второй проход не нужен." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    cout << "Min = " << 0 /* your min */ << endl;
    cout << "Max = " << 0 /* your max */ << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    cout << "Min = " << 0 /* your min */ << endl;
    cout << "Max = " << 0 /* your max */ << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Sum and Average of Array",
    title_uz: "Massivning Yig'indisi va O'rtachasi",
    title_ru: "Сумма и среднее массива",
    en: [
      "Declare an integer array of size 8.",
      "Read 8 numbers from the user.",
      "<b>(a)</b> Compute and print the SUM of all elements.",
      "<b>(b)</b> Compute and print the AVERAGE as a <code>double</code> (sum / 8).",
      "Example: input <code>10 20 30 40 50 60 70 80</code> -> output <code>Sum = 360</code> and <code>Average = 45</code>",
    ],
    uz: [
      "8 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 8 ta sonni o'qing.",
      "<b>(a)</b> Barcha elementlar YIG'INDISINI hisoblab, chiqaring.",
      "<b>(b)</b> O'RTACHANI <code>double</code> sifatida hisoblab (yig'indi / 8), chiqaring.",
      "Misol: kirish <code>10 20 30 40 50 60 70 80</code> -> natija <code>Sum = 360</code> va <code>Average = 45</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8.",
      "Прочитайте 8 чисел от пользователя.",
      "<b>(а)</b> Вычислите и выведите СУММУ всех элементов.",
      "<b>(б)</b> Вычислите и выведите СРЕДНЕЕ как <code>double</code> (сумма / 8).",
      "Пример: ввод <code>10 20 30 40 50 60 70 80</code> -> вывод <code>Sum = 360</code> и <code>Average = 45</code>",
    ],
    hints: [
      { en: "Use a single loop to accumulate the sum.", uz: "Yig'indini to'plash uchun bitta sikldan foydalaning.", ru: "Используйте один цикл для накопления суммы." },
      { en: "For the average, cast to <code>double</code> so you don't lose the decimal part.", uz: "O'rtacha uchun <code>double</code> ga o'tkazing, aks holda kasr qism yo'qoladi.", ru: "Для среднего приведите к <code>double</code>, чтобы не потерять дробную часть." },
      { en: "Print sum first, then average on the next line.", uz: "Avval yig'indini, keyin o'rtachani chiqaring.", ru: "Сначала выведите сумму, затем среднее на следующей строке." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int sum = 0;

    cout << "Sum = " << sum << endl;
    cout << "Average = " << 0.0 /* replace */ << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int sum = 0;

    cout << "Sum = " << sum << endl;
    cout << "Average = " << 0.0 /* replace */ << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Count Vowels and Consonants",
    title_uz: "Unli va Undosh Harflarni Sanash",
    title_ru: "Подсчёт гласных и согласных",
    en: [
      "Ask the user to enter a lowercase word (no spaces, letters only).",
      "Use a <code>for</code> loop to go through each character.",
      "<b>(a)</b> Count how many characters are VOWELS (a, e, i, o, u).",
      "<b>(b)</b> Count how many characters are CONSONANTS (everything else that's a letter).",
      "Example: input <code>programming</code> -> output <code>Vowels: 3</code> and <code>Consonants: 8</code>",
    ],
    uz: [
      "Foydalanuvchidan kichik harflar bilan yozilgan so'zni so'rang (bo'shliqsiz, faqat harflar).",
      "Har bir belgi bo'ylab <code>for</code> siklini yuring.",
      "<b>(a)</b> Qancha belgi UNLI (a, e, i, o, u) ekanligini sanang.",
      "<b>(b)</b> Qancha belgi UNDOSH (harf bo'lib, lekin unli bo'lmagan) ekanligini sanang.",
      "Misol: kirish <code>programming</code> -> natija <code>Vowels: 3</code> va <code>Consonants: 8</code>",
    ],
    ru: [
      "Попросите пользователя ввести слово в нижнем регистре (без пробелов, только буквы).",
      "С помощью цикла <code>for</code> пройдите по каждому символу.",
      "<b>(а)</b> Подсчитайте, сколько символов являются ГЛАСНЫМИ (a, e, i, o, u).",
      "<b>(б)</b> Подсчитайте, сколько символов являются СОГЛАСНЫМИ (все остальные буквы).",
      "Пример: ввод <code>programming</code> -> вывод <code>Vowels: 3</code> и <code>Consonants: 8</code>",
    ],
    hints: [
      { en: "Check each <code>s[i]</code> against the 5 vowel characters.", uz: "Har bir <code>s[i]</code> ni 5 ta unli harf bilan solishtiring.", ru: "Сравнивайте каждый <code>s[i]</code> с 5 гласными символами." },
      { en: "If a character is a letter (a-z) and NOT a vowel, it's a consonant.", uz: "Agar belgi harf (a-z) bo'lib, unli bo'lmasa, u undosh.", ru: "Если символ - буква (a-z) и НЕ гласная, значит это согласная." },
      { en: "Use two separate counter variables.", uz: "Ikki alohida hisoblagich o'zgaruvchidan foydalaning.", ru: "Используйте две отдельные переменные-счётчика." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a lowercase word: ";
    cin >> word;

    int vowels = 0, consonants = 0;

    cout << "Vowels: " << vowels << endl;
    cout << "Consonants: " << consonants << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string word;
    cout << "Enter a lowercase word: ";
    cin >> word;

    int vowels = 0, consonants = 0;

    cout << "Vowels: " << vowels << endl;
    cout << "Consonants: " << consonants << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Sort Array in Ascending Order",
    title_uz: "Massivni O'sish Tartibida Saralash",
    title_ru: "Сортировать массив по возрастанию",
    en: [
      "Declare an integer array of size 6.",
      "Read 6 numbers from the user.",
      "<b>(a)</b> Sort the array in ASCENDING order using bubble sort (nested loops).",
      "<b>(b)</b> Print the sorted array, space-separated.",
      "Example: input <code>5 2 8 1 9 3</code> -> output <code>Sorted: 1 2 3 5 8 9</code>",
    ],
    uz: [
      "6 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 6 ta sonni o'qing.",
      "<b>(a)</b> Massivni O'SISH tartibida bubble sort yordamida (ichki-ichki sikllar) sarlang.",
      "<b>(b)</b> Sarlangan massivni bo'sh joy bilan ajratib chiqaring.",
      "Misol: kirish <code>5 2 8 1 9 3</code> -> natija <code>Sorted: 1 2 3 5 8 9</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 6.",
      "Прочитайте 6 чисел от пользователя.",
      "<b>(а)</b> Отсортируйте массив по ВОЗРАСТАНИЮ методом пузырька (вложенные циклы).",
      "<b>(б)</b> Выведите отсортированный массив через пробел.",
      "Пример: ввод <code>5 2 8 1 9 3</code> -> вывод <code>Sorted: 1 2 3 5 8 9</code>",
    ],
    hints: [
      { en: "Bubble sort: compare adjacent pairs; swap if the left is larger than the right.", uz: "Bubble sort: qo'shni juftliklarni taqqoslang; chap o'ngdan katta bo'lsa, almashtiring.", ru: "Пузырьковая сортировка: сравнивайте соседние пары; меняйте местами, если левый больше правого." },
      { en: "Use two nested loops. Outer loop runs n-1 times; inner does the comparisons.", uz: "Ikki ichki-ichki sikl. Tashqi sikl n-1 marta; ichki sikl taqqoslashni bajaradi.", ru: "Используйте два вложенных цикла. Внешний выполняется n-1 раз; внутренний делает сравнения." },
      { en: "To swap: <code>int t = a; a = b; b = t;</code>", uz: "Almashtirish uchun: <code>int t = a; a = b; b = t;</code>", ru: "Для обмена: <code>int t = a; a = b; b = t;</code>" },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Sorted: ";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6];

    cout << "Enter 6 numbers: ";

    cout << "Sorted: ";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Sum of Positives and Negatives",
    title_uz: "Musbat va Manfiy Sonlar Yig'indisi",
    title_ru: "Сумма положительных и отрицательных",
    en: [
      "Declare an integer array of size 8.",
      "Read 8 numbers (positive, negative, or zero) from the user.",
      "<b>(a)</b> Compute the sum of all POSITIVE numbers and print it.",
      "<b>(b)</b> Compute the sum of all NEGATIVE numbers (as a negative total) and print it.",
      "Example: input <code>3 -2 5 -7 0 4 -1 6</code> -> <code>Positives = 18 / Negatives = -10</code>",
    ],
    uz: [
      "8 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 8 ta sonni o'qing (musbat, manfiy yoki nol).",
      "<b>(a)</b> Barcha MUSBAT sonlarning yig'indisini hisoblab, chiqaring.",
      "<b>(b)</b> Barcha MANFIY sonlarning yig'indisini (manfiy jami sifatida) hisoblab, chiqaring.",
      "Misol: kirish <code>3 -2 5 -7 0 4 -1 6</code> -> <code>Positives = 18 / Negatives = -10</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8.",
      "Прочитайте 8 чисел (положительные, отрицательные или ноль) от пользователя.",
      "<b>(а)</b> Вычислите сумму всех ПОЛОЖИТЕЛЬНЫХ чисел и выведите её.",
      "<b>(б)</b> Вычислите сумму всех ОТРИЦАТЕЛЬНЫХ чисел (как отрицательный итог) и выведите её.",
      "Пример: ввод <code>3 -2 5 -7 0 4 -1 6</code> -> <code>Positives = 18 / Negatives = -10</code>",
    ],
    hints: [
      { en: "Use two accumulator variables, e.g. <code>sumPos</code> and <code>sumNeg</code>, both starting at 0.", uz: "Ikkita to'plovchi o'zgaruvchi ishlating, masalan <code>sumPos</code> va <code>sumNeg</code>, ikkalasi 0 dan boshlanadi.", ru: "Используйте две переменные-накопителя, например <code>sumPos</code> и <code>sumNeg</code>, обе начинаются с 0." },
      { en: "In one loop, check <code>arr[i] > 0</code> to add to sumPos, <code>arr[i] < 0</code> to add to sumNeg.", uz: "Bitta siklda <code>arr[i] > 0</code> bo'lsa sumPos ga, <code>arr[i] < 0</code> bo'lsa sumNeg ga qo'shing.", ru: "В одном цикле: если <code>arr[i] &gt; 0</code> - прибавьте к sumPos, если <code>arr[i] &lt; 0</code> - к sumNeg." },
      { en: "Zero is neither positive nor negative - skip it.", uz: "Nol na musbat, na manfiy - uni o'tkazib yuboring.", ru: "Ноль не является ни положительным, ни отрицательным - пропустите его." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int sumPos = 0, sumNeg = 0;

    cout << "Positives = " << sumPos << endl;
    cout << "Negatives = " << sumNeg << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int sumPos = 0, sumNeg = 0;

    cout << "Positives = " << sumPos << endl;
    cout << "Negatives = " << sumNeg << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Replace Character in a String",
    title_uz: "Satrdagi Harfni Almashtirish",
    title_ru: "Замена символа в строке",
    en: [
      "Read a string (one word, no spaces) from the user.",
      "Read two characters: <code>oldChar</code> and <code>newChar</code>.",
      "<b>(a)</b> Count how many times <code>oldChar</code> appears in the string and print the count.",
      "<b>(b)</b> Replace every occurrence of <code>oldChar</code> with <code>newChar</code> and print the resulting string.",
      "Example: input <code>banana</code>, <code>a</code>, <code>o</code> -> <code>Count = 3 / Result = bonono</code>",
    ],
    uz: [
      "Foydalanuvchidan bitta so'z (bo'shliqsiz) o'qing.",
      "Ikkita belgini o'qing: <code>oldChar</code> va <code>newChar</code>.",
      "<b>(a)</b> Satrda <code>oldChar</code> necha marta uchrashini sanab, chiqaring.",
      "<b>(b)</b> Har bir <code>oldChar</code> ni <code>newChar</code> bilan almashtirib, natijaviy satrni chiqaring.",
      "Misol: kirish <code>banana</code>, <code>a</code>, <code>o</code> -> <code>Count = 3 / Result = bonono</code>",
    ],
    ru: [
      "Прочитайте строку (одно слово, без пробелов) от пользователя.",
      "Прочитайте два символа: <code>oldChar</code> и <code>newChar</code>.",
      "<b>(а)</b> Подсчитайте, сколько раз <code>oldChar</code> встречается в строке, и выведите это количество.",
      "<b>(б)</b> Замените каждое вхождение <code>oldChar</code> на <code>newChar</code> и выведите получившуюся строку.",
      "Пример: ввод <code>banana</code>, <code>a</code>, <code>o</code> -> <code>Count = 3 / Result = bonono</code>",
    ],
    hints: [
      { en: "Use <code>string.length()</code> for the loop bound.", uz: "Sikl chegarasi uchun <code>string.length()</code> ishlating.", ru: "Используйте <code>string.length()</code> как границу цикла." },
      { en: "For (a), increment a counter every time <code>s[i] == oldChar</code>.", uz: "(a) uchun, har safar <code>s[i] == oldChar</code> bo'lganda sanoqchini oshiring.", ru: "Для (а) увеличивайте счётчик каждый раз, когда <code>s[i] == oldChar</code>." },
      { en: "For (b), assign <code>s[i] = newChar</code> directly when they match.", uz: "(b) uchun, mos kelganda to'g'ridan-to'g'ri <code>s[i] = newChar</code> qiling.", ru: "Для (б) при совпадении напрямую присвойте <code>s[i] = newChar</code>." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    char oldChar, newChar;

    cout << "Enter a word: ";
    cin >> s;
    cout << "Enter character to replace: ";
    cin >> oldChar;
    cout << "Enter replacement character: ";
    cin >> newChar;

    int count = 0;

    cout << "Count = " << count << endl;
    cout << "Result = " << s << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    char oldChar, newChar;

    cout << "Enter a word: ";
    cin >> s;
    cout << "Enter character to replace: ";
    cin >> oldChar;
    cout << "Enter replacement character: ";
    cin >> newChar;

    int count = 0;

    cout << "Count = " << count << endl;
    cout << "Result = " << s << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Find and Double Largest Element",
    title_uz: "Eng Katta Elementni Topib, Ikkilantirish",
    title_ru: "Найти и удвоить наибольший элемент",
    en: [
      "Declare an integer array of size 7.",
      "Read 7 numbers from the user.",
      "<b>(a)</b> Find the LARGEST value and its INDEX in the array. Print both.",
      "<b>(b)</b> Double the largest value (multiply by 2) in place, then print the whole array on one line separated by spaces.",
      "Example: input <code>4 12 7 9 3 15 8</code> -> <code>Largest = 15 at index 5 / Array: 4 12 7 9 3 30 8</code>",
    ],
    uz: [
      "7 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 7 ta sonni o'qing.",
      "<b>(a)</b> Massivdagi ENG KATTA qiymat va uning INDEKSINI toping. Ikkalasini chiqaring.",
      "<b>(b)</b> Eng katta qiymatni joyida ikkilantiring (2 ga ko'paytiring), so'ng butun massivni bitta qatorda, probel bilan ajratilgan holda chiqaring.",
      "Misol: kirish <code>4 12 7 9 3 15 8</code> -> <code>Largest = 15 at index 5 / Array: 4 12 7 9 3 30 8</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 7.",
      "Прочитайте 7 чисел от пользователя.",
      "<b>(а)</b> Найдите НАИБОЛЬШЕЕ значение и его ИНДЕКС в массиве. Выведите оба.",
      "<b>(б)</b> Удвойте наибольшее значение (умножьте на 2) на месте, затем выведите весь массив в одну строку через пробел.",
      "Пример: ввод <code>4 12 7 9 3 15 8</code> -> <code>Largest = 15 at index 5 / Array: 4 12 7 9 3 30 8</code>",
    ],
    hints: [
      { en: "Track both the max value AND its index as you loop.", uz: "Sikl yurgizishda ham max qiymatni, ham uning indeksini kuzating.", ru: "В цикле отслеживайте и максимальное значение, И его индекс." },
      { en: "After finding the max index, <code>arr[maxIdx] *= 2;</code>.", uz: "Max indeksni topgandan keyin <code>arr[maxIdx] *= 2;</code>.", ru: "Найдя индекс максимума, выполните <code>arr[maxIdx] *= 2;</code>." },
      { en: "Then print each element followed by a space.", uz: "Keyin har bir elementni probel bilan chiqaring.", ru: "Затем выведите каждый элемент, разделяя пробелом." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[7];

    cout << "Enter 7 numbers: ";

    int maxVal = arr[0], maxIdx = 0;

    cout << "Largest = " << maxVal << " at index " << maxIdx << endl;

    cout << "Array: ";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[7];

    cout << "Enter 7 numbers: ";

    int maxVal = arr[0], maxIdx = 0;

    cout << "Largest = " << maxVal << " at index " << maxIdx << endl;

    cout << "Array: ";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Count Even and Odd in Array",
    title_uz: "Massivda Juft va Toq Sonlarni Sanash",
    title_ru: "Подсчёт чётных и нечётных в массиве",
    en: [
      "Declare an integer array of size 8.",
      "Read 8 numbers from the user.",
      "<b>(a)</b> Count how many numbers are EVEN and print the count.",
      "<b>(b)</b> Count how many numbers are ODD and print the count.",
      "Example: input <code>1 4 7 2 9 6 3 8</code> -> output <code>Even: 4</code> and <code>Odd: 4</code>",
    ],
    uz: [
      "8 o'lchamli butun sonli massiv e'lon qiling.",
      "Foydalanuvchidan 8 ta sonni o'qing.",
      "<b>(a)</b> Qancha son JUFT ekanligini sanang va chiqaring.",
      "<b>(b)</b> Qancha son TOQ ekanligini sanang va chiqaring.",
      "Misol: kirish <code>1 4 7 2 9 6 3 8</code> -> natija <code>Even: 4</code> va <code>Odd: 4</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8.",
      "Прочитайте 8 чисел от пользователя.",
      "<b>(а)</b> Подсчитайте, сколько чисел ЧЁТНЫЕ, и выведите это количество.",
      "<b>(б)</b> Подсчитайте, сколько чисел НЕЧЁТНЫЕ, и выведите это количество.",
      "Пример: ввод <code>1 4 7 2 9 6 3 8</code> -> вывод <code>Even: 4</code> и <code>Odd: 4</code>",
    ],
    hints: [
      { en: "A number is even if <code>n % 2 == 0</code>; odd otherwise.", uz: "<code>n % 2 == 0</code> bo'lsa juft; aks holda toq.", ru: "Число чётное, если <code>n % 2 == 0</code>; иначе нечётное." },
      { en: "Use two counter variables, increment one or the other per element.", uz: "Ikki hisoblagich ishlatib, har bir element uchun birini oshiring.", ru: "Используйте две переменные-счётчика, увеличивая одну из них для каждого элемента." },
      { en: "One pass through the array is enough for both.", uz: "Ikkisi uchun ham massivdan bir marta o'tish kifoya.", ru: "Одного прохода по массиву достаточно для обоих подсчётов." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int evens = 0, odds = 0;

    cout << "Even: " << evens << endl;
    cout << "Odd: " << odds << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8];

    cout << "Enter 8 numbers: ";

    int evens = 0, odds = 0;

    cout << "Even: " << evens << endl;
    cout << "Odd: " << odds << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Reverse a String AND Count Its Length",
    title_uz: "Satrni Teskari Yozish va Uzunligini Sanash",
    title_ru: "Перевернуть строку И подсчитать её длину",
    en: [
      "Ask the user to enter a word (no spaces).",
      "<b>(a)</b> Print the string's LENGTH (number of characters).",
      "<b>(b)</b> Print the string in REVERSE order (last character to first).",
      "Do not use the built-in <code>reverse</code> function - write a loop.",
      "Example: input <code>hello</code> -> output <code>Length: 5</code> and <code>Reversed: olleh</code>",
    ],
    uz: [
      "Foydalanuvchidan so'z kiritishni so'rang (bo'shliqsiz).",
      "<b>(a)</b> Satrning UZUNLIGINI (belgilar soni) chiqaring.",
      "<b>(b)</b> Satrni TESKARI tartibda chiqaring (oxirgi belgidan birinchiga).",
      "Ichki <code>reverse</code> funksiyasidan foydalanmang - sikl yozing.",
      "Misol: kirish <code>hello</code> -> natija <code>Length: 5</code> va <code>Reversed: olleh</code>",
    ],
    ru: [
      "Попросите пользователя ввести слово (без пробелов).",
      "<b>(а)</b> Выведите ДЛИНУ строки (число символов).",
      "<b>(б)</b> Выведите строку в ОБРАТНОМ порядке (с последнего символа до первого).",
      "Не используйте встроенную функцию <code>reverse</code> - напишите цикл.",
      "Пример: ввод <code>hello</code> -> вывод <code>Length: 5</code> и <code>Reversed: olleh</code>",
    ],
    hints: [
      { en: "Use <code>s.length()</code> for part (a).", uz: "(a) qismi uchun <code>s.length()</code> dan foydalaning.", ru: "Для части (а) используйте <code>s.length()</code>." },
      { en: "For part (b), loop <code>i</code> from <code>s.length() - 1</code> down to 0.", uz: "(b) qismi uchun <code>i</code> ni <code>s.length() - 1</code> dan 0 gacha kamaytiring.", ru: "Для части (б) идите циклом <code>i</code> от <code>s.length() - 1</code> до 0." },
      { en: "Print each <code>s[i]</code> without newlines between characters.", uz: "Har bir <code>s[i]</code> ni belgilar orasiga yangi satr qo'ymasdan chiqaring.", ru: "Выводите каждый <code>s[i]</code> без переводов строки между символами." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    cout << "Length: " << 0 /* replace */ << endl;

    cout << "Reversed: ";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a word: ";
    cin >> s;

    cout << "Length: " << 0 /* replace */ << endl;

    cout << "Reversed: ";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Count Occurrences of a Target in Array",
    title_uz: "Massivda Maqsadli Sonning Takrorlanishlarini Sanash",
    title_ru: "Подсчёт вхождений значения в массиве",
    en: [
      "Declare an integer array of size 10 with the values <code>{3, 7, 3, 2, 5, 3, 8, 3, 1, 4}</code>.",
      "Read a target number <code>t</code> from the user.",
      "<b>(a)</b> Count how many times <code>t</code> appears in the array.",
      "<b>(b)</b> Print the INDEXES (0-based) where <code>t</code> appears, space-separated.",
      "Example: input <code>3</code> -> output <code>Count = 4</code> and <code>Indexes: 0 2 5 7</code>",
    ],
    uz: [
      "10 o'lchamli butun massiv e'lon qiling: <code>{3, 7, 3, 2, 5, 3, 8, 3, 1, 4}</code>.",
      "Foydalanuvchidan <code>t</code> maqsadli sonini o'qing.",
      "<b>(a)</b> <code>t</code> massivda necha marta uchrashini sanang.",
      "<b>(b)</b> <code>t</code> uchragan INDEKSLARNI (0-dan boshlab) bo'sh joy bilan ajratib chiqaring.",
      "Misol: kirish <code>3</code> -> natija <code>Count = 4</code> va <code>Indexes: 0 2 5 7</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 10 со значениями <code>{3, 7, 3, 2, 5, 3, 8, 3, 1, 4}</code>.",
      "Прочитайте целевое число <code>t</code> от пользователя.",
      "<b>(а)</b> Подсчитайте, сколько раз <code>t</code> встречается в массиве.",
      "<b>(б)</b> Выведите ИНДЕКСЫ (с 0), где встречается <code>t</code>, через пробел.",
      "Пример: ввод <code>3</code> -> вывод <code>Count = 4</code> и <code>Indexes: 0 2 5 7</code>",
    ],
    hints: [
      { en: "Use a single loop with index <code>i</code> from 0 to 9.", uz: "<code>i</code> 0 dan 9 gacha bitta sikl ishlatin.", ru: "Используйте один цикл с индексом <code>i</code> от 0 до 9." },
      { en: "When <code>arr[i] == t</code>: increment the count AND print <code>i</code>.", uz: "<code>arr[i] == t</code> bo'lganda: count ni oshiring VA <code>i</code> ni chiqaring.", ru: "Когда <code>arr[i] == t</code>: увеличивайте счётчик И выводите <code>i</code>." },
      { en: "Print the final count AFTER the loop finishes.", uz: "Yakuniy count ni sikl tugagach chiqaring.", ru: "Выведите итоговый счётчик ПОСЛЕ окончания цикла." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[10] = {3, 7, 3, 2, 5, 3, 8, 3, 1, 4};

    int t;
    cout << "Enter target: ";
    cin >> t;

    int count = 0;

    cout << "Indexes: ";

    cout << endl;
    cout << "Count = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[10] = {3, 7, 3, 2, 5, 3, 8, 3, 1, 4};

    int t;
    cout << "Enter target: ";
    cin >> t;

    int count = 0;

    cout << "Indexes: ";

    cout << endl;
    cout << "Count = " << count << endl;
    return 0;
}`,
  },

  // =================================================================
  // CATEGORY: easy_medium_starter (15) - added May 2026
  // First-slot 10-point problems for the new exam format.
  // No hints - these are the gentlest problems on the exam.
  // =================================================================
  {
    category: "easy_medium_starter",
    title_en: "Print Multiples of 3 up to N",
    title_uz: "1 dan N gacha 3 ga karralilarni chiqarish",
    title_ru: "Вывод чисел, кратных 3, от 1 до N",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Use a <code>for</code> loop from 1 to <code>n</code>.",
      "Inside the loop, use an <code>if</code> to print numbers divisible by 3, separated by spaces.",
      "Example: input <code>10</code> -> output <code>3 6 9</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son <code>n</code> ni o'qing.",
      "1 dan <code>n</code> gacha <code>for</code> sikl yozing.",
      "Sikl ichida <code>if</code> bilan 3 ga karrali sonlarni bo'sh joy bilan chiqaring.",
      "Misol: kirish <code>10</code> -> natija <code>3 6 9</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Используйте цикл <code>for</code> от 1 до <code>n</code>.",
      "Внутри цикла с помощью <code>if</code> выводите числа, кратные 3, через пробел.",
      "Пример: ввод <code>10</code> -> вывод <code>3 6 9</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    cout << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Count Positive Numbers Entered",
    title_uz: "Kiritilgan musbat sonlarni sanash",
    title_ru: "Подсчёт введённых положительных чисел",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Then read <code>n</code> integers (one per line).",
      "Count how many of them are STRICTLY positive (> 0).",
      "Print: <code>Positives = ...</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun <code>n</code> ni o'qing.",
      "Keyin <code>n</code> ta butun son o'qing (har bir qatorda bittadan).",
      "Ulardan QAT'IY musbat (> 0) sonlar nechta ekanini sanang.",
      "Chiqaring: <code>Positives = ...</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Затем прочитайте <code>n</code> целых чисел (по одному в строке).",
      "Подсчитайте, сколько из них СТРОГО положительные (> 0).",
      "Выведите: <code>Positives = ...</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int count = 0;

    cout << "Positives = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int count = 0;

    cout << "Positives = " << count << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Square Function",
    title_uz: "Kvadrat funksiyasi",
    title_ru: "Функция квадрата",
    en: [
      "Define a function <code>int square(int x)</code> that returns <code>x * x</code>.",
      "In <code>main</code>, read an integer from the user.",
      "Call <code>square</code> on it and print the result.",
      "Example: input <code>7</code> -> output <code>Square = 49</code>",
    ],
    uz: [
      "<code>x * x</code> ni qaytaradigan <code>int square(int x)</code> funksiyasini aniqlang.",
      "<code>main</code> da foydalanuvchidan butun son o'qing.",
      "<code>square</code> ni chaqiring va natijani chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>Square = 49</code>",
    ],
    ru: [
      "Определите функцию <code>int square(int x)</code>, возвращающую <code>x * x</code>.",
      "В <code>main</code> прочитайте целое число от пользователя.",
      "Вызовите <code>square</code> на нём и выведите результат.",
      "Пример: ввод <code>7</code> -> вывод <code>Square = 49</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Sum Function (1 to N)",
    title_uz: "Yig'indi funksiyasi (1 dan N gacha)",
    title_ru: "Функция суммы (от 1 до N)",
    en: [
      "Define a function <code>int sumTo(int n)</code> that returns 1+2+...+n using a loop.",
      "In <code>main</code>, read <code>n</code> from the user.",
      "Call <code>sumTo(n)</code> and print the result.",
      "Example: input <code>5</code> -> output <code>Sum = 15</code>",
    ],
    uz: [
      "Sikl yordamida 1+2+...+n ni qaytaradigan <code>int sumTo(int n)</code> funksiyasini aniqlang.",
      "<code>main</code> da foydalanuvchidan <code>n</code> ni o'qing.",
      "<code>sumTo(n)</code> ni chaqiring va natijani chiqaring.",
      "Misol: kirish <code>5</code> -> natija <code>Sum = 15</code>",
    ],
    ru: [
      "Определите функцию <code>int sumTo(int n)</code>, которая возвращает 1+2+...+n с помощью цикла.",
      "В <code>main</code> прочитайте <code>n</code> от пользователя.",
      "Вызовите <code>sumTo(n)</code> и выведите результат.",
      "Пример: ввод <code>5</code> -> вывод <code>Sum = 15</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Is Even Function",
    title_uz: "Juft son funksiyasi",
    title_ru: "Функция проверки чётности",
    en: [
      "Define a function <code>bool isEven(int x)</code> that returns <code>true</code> if x is even.",
      "In <code>main</code>, read an integer from the user.",
      "Use <code>isEven</code> with an <code>if-else</code> to print <code>Even</code> or <code>Odd</code>.",
      "Example: input <code>7</code> -> output <code>Odd</code>",
    ],
    uz: [
      "x juft bo'lsa <code>true</code> qaytaruvchi <code>bool isEven(int x)</code> funksiyasini aniqlang.",
      "<code>main</code> da foydalanuvchidan butun son o'qing.",
      "<code>isEven</code> ni <code>if-else</code> bilan ishlating va <code>Even</code> yoki <code>Odd</code> chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>Odd</code>",
    ],
    ru: [
      "Определите функцию <code>bool isEven(int x)</code>, которая возвращает <code>true</code>, если x чётное.",
      "В <code>main</code> прочитайте целое число от пользователя.",
      "Используйте <code>isEven</code> с <code>if-else</code>, чтобы вывести <code>Even</code> или <code>Odd</code>.",
      "Пример: ввод <code>7</code> -> вывод <code>Odd</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Sum Array Function",
    title_uz: "Massiv yig'indisi funksiyasi",
    title_ru: "Функция суммы массива",
    en: [
      "Define a function <code>int sumArray(int arr[], int n)</code> that returns the sum of n elements.",
      "In <code>main</code>, declare an array <code>{4, 8, 15, 16, 23, 42}</code> (size 6).",
      "Call <code>sumArray(arr, 6)</code> and print the result.",
      "Expected output: <code>Sum = 108</code>",
    ],
    uz: [
      "n ta elementning yig'indisini qaytaruvchi <code>int sumArray(int arr[], int n)</code> funksiyasini aniqlang.",
      "<code>main</code> da <code>{4, 8, 15, 16, 23, 42}</code> (o'lcham 6) massivini e'lon qiling.",
      "<code>sumArray(arr, 6)</code> ni chaqiring va natijani chiqaring.",
      "Kutilgan natija: <code>Sum = 108</code>",
    ],
    ru: [
      "Определите функцию <code>int sumArray(int arr[], int n)</code>, возвращающую сумму n элементов.",
      "В <code>main</code> объявите массив <code>{4, 8, 15, 16, 23, 42}</code> (размер 6).",
      "Вызовите <code>sumArray(arr, 6)</code> и выведите результат.",
      "Ожидаемый вывод: <code>Sum = 108</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {4, 8, 15, 16, 23, 42};

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {4, 8, 15, 16, 23, 42};

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Count Negatives in Array",
    title_uz: "Massivdagi manfiy sonlarni sanash",
    title_ru: "Подсчёт отрицательных в массиве",
    en: [
      "Declare an integer array of size 8: <code>{3, -1, 7, -4, -2, 9, 5, -6}</code>.",
      "Use a <code>for</code> loop to count how many are negative (&lt; 0).",
      "Print: <code>Negatives = ...</code>",
      "Expected output: <code>Negatives = 4</code>",
    ],
    uz: [
      "8 o'lchamli butun massiv e'lon qiling: <code>{3, -1, 7, -4, -2, 9, 5, -6}</code>.",
      "Manfiy (&lt; 0) sonlar sonini <code>for</code> sikl bilan sanang.",
      "Chiqaring: <code>Negatives = ...</code>",
      "Kutilgan natija: <code>Negatives = 4</code>",
    ],
    ru: [
      "Объявите целочисленный массив размера 8: <code>{3, -1, 7, -4, -2, 9, 5, -6}</code>.",
      "С помощью цикла <code>for</code> подсчитайте, сколько из них отрицательные (&lt; 0).",
      "Выведите: <code>Negatives = ...</code>",
      "Ожидаемый вывод: <code>Negatives = 4</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[8] = {3, -1, 7, -4, -2, 9, 5, -6};
    int count = 0;

    cout << "Negatives = " << count << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[8] = {3, -1, 7, -4, -2, 9, 5, -6};
    int count = 0;

    cout << "Negatives = " << count << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Max of Two Function",
    title_uz: "Ikki sondan kattasi funksiyasi",
    title_ru: "Функция максимума из двух",
    en: [
      "Define a function <code>int maxOf(int a, int b)</code> that returns the larger value.",
      "In <code>main</code>, read two integers from the user.",
      "Call <code>maxOf</code> and print: <code>Max = ...</code>",
      "Example: input <code>15 9</code> -> output <code>Max = 15</code>",
    ],
    uz: [
      "Kattaroq qiymatni qaytaruvchi <code>int maxOf(int a, int b)</code> funksiyasini aniqlang.",
      "<code>main</code> da foydalanuvchidan ikkita butun son o'qing.",
      "<code>maxOf</code> ni chaqiring va chiqaring: <code>Max = ...</code>",
      "Misol: kirish <code>15 9</code> -> natija <code>Max = 15</code>",
    ],
    ru: [
      "Определите функцию <code>int maxOf(int a, int b)</code>, возвращающую большее значение.",
      "В <code>main</code> прочитайте два целых числа от пользователя.",
      "Вызовите <code>maxOf</code> и выведите: <code>Max = ...</code>",
      "Пример: ввод <code>15 9</code> -> вывод <code>Max = 15</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "Enter two integers: ";
    cin >> a >> b;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cout << "Enter two integers: ";
    cin >> a >> b;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Star Triangle of Height N",
    title_uz: "Balandligi N bo'lgan yulduzlar uchburchagi",
    title_ru: "Треугольник из звёзд высоты N",
    en: [
      "Read a positive integer <code>n</code> (height) from the user.",
      "Print n lines: line i has i asterisks (*).",
      "Example: input <code>4</code> -> output:<br><code>*</code><br><code>**</code><br><code>***</code><br><code>****</code>",
      "Use a nested loop or repeated print logic.",
    ],
    uz: [
      "Foydalanuvchidan musbat butun <code>n</code> (balandlik) ni o'qing.",
      "n ta qator chiqaring: i-qatorda i ta yulduz (*).",
      "Misol: kirish <code>4</code> -> natija:<br><code>*</code><br><code>**</code><br><code>***</code><br><code>****</code>",
      "Ichma-ich sikl yoki takroriy chiqarish mantig'idan foydalaning.",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> (высота) от пользователя.",
      "Выведите n строк: в i-й строке - i звёздочек (*).",
      "Пример: ввод <code>4</code> -> вывод:<br><code>*</code><br><code>**</code><br><code>***</code><br><code>****</code>",
      "Используйте вложенный цикл или повторяющуюся логику вывода.",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter height: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter height: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Print Array Function",
    title_uz: "Massivni chiqarish funksiyasi",
    title_ru: "Функция печати массива",
    en: [
      "Define a function <code>void printArray(int arr[], int n)</code> that prints the n elements separated by spaces.",
      "In <code>main</code>, declare <code>{5, 3, 8, 1, 9}</code> (size 5).",
      "Call <code>printArray(arr, 5)</code> to print all of them.",
      "Expected output: <code>5 3 8 1 9</code>",
    ],
    uz: [
      "n ta elementni bo'sh joy bilan chiqaruvchi <code>void printArray(int arr[], int n)</code> funksiyasini aniqlang.",
      "<code>main</code> da <code>{5, 3, 8, 1, 9}</code> (o'lcham 5) ni e'lon qiling.",
      "Hammasini chiqarish uchun <code>printArray(arr, 5)</code> ni chaqiring.",
      "Kutilgan natija: <code>5 3 8 1 9</code>",
    ],
    ru: [
      "Определите функцию <code>void printArray(int arr[], int n)</code>, выводящую n элементов через пробел.",
      "В <code>main</code> объявите <code>{5, 3, 8, 1, 9}</code> (размер 5).",
      "Вызовите <code>printArray(arr, 5)</code>, чтобы вывести их все.",
      "Ожидаемый вывод: <code>5 3 8 1 9</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[5] = {5, 3, 8, 1, 9};

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[5] = {5, 3, 8, 1, 9};

    cout << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Average of First 5 Inputs",
    title_uz: "Birinchi 5 kirituvning o'rtachasi",
    title_ru: "Среднее первых 5 введённых чисел",
    en: [
      "Read exactly 5 doubles from the user (one per line).",
      "Compute their sum, then their average (sum / 5).",
      "Print: <code>Average = ...</code>",
      "Example: inputs <code>1 2 3 4 5</code> -> output <code>Average = 3</code>",
    ],
    uz: [
      "Foydalanuvchidan aniq 5 ta double o'qing (har biri yangi qatorda).",
      "Yig'indini, so'ng o'rtachani (yig'indi / 5) hisoblang.",
      "Chiqaring: <code>Average = ...</code>",
      "Misol: kirish <code>1 2 3 4 5</code> -> natija <code>Average = 3</code>",
    ],
    ru: [
      "Прочитайте ровно 5 значений типа double от пользователя (по одному в строке).",
      "Вычислите их сумму, затем среднее (сумма / 5).",
      "Выведите: <code>Average = ...</code>",
      "Пример: ввод <code>1 2 3 4 5</code> -> вывод <code>Average = 3</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    double x;
    double sum = 0;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    double x;
    double sum = 0;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Absolute Value Function",
    title_uz: "Mutlaq qiymat funksiyasi",
    title_ru: "Функция модуля числа",
    en: [
      "Define a function <code>int myAbs(int x)</code> that returns the absolute value (non-negative).",
      "Use an <code>if-else</code> inside the function (do not use <code>abs()</code>).",
      "In <code>main</code>, read an integer and print: <code>|n| = ...</code>",
      "Example: input <code>-7</code> -> output <code>|n| = 7</code>",
    ],
    uz: [
      "Mutlaq qiymatni (nomanfiy) qaytaruvchi <code>int myAbs(int x)</code> funksiyasini aniqlang.",
      "Funksiya ichida <code>if-else</code> dan foydalaning (<code>abs()</code> ni ishlatmang).",
      "<code>main</code> da butun son o'qing va chiqaring: <code>|n| = ...</code>",
      "Misol: kirish <code>-7</code> -> natija <code>|n| = 7</code>",
    ],
    ru: [
      "Определите функцию <code>int myAbs(int x)</code>, возвращающую абсолютное значение (неотрицательное).",
      "Используйте внутри функции <code>if-else</code> (не используйте <code>abs()</code>).",
      "В <code>main</code> прочитайте целое число и выведите: <code>|n| = ...</code>",
      "Пример: ввод <code>-7</code> -> вывод <code>|n| = 7</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Largest of N Inputs",
    title_uz: "N ta kirituvning eng kattasi",
    title_ru: "Наибольшее из N введённых",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Then read <code>n</code> integers.",
      "Find and print the LARGEST of them.",
      "Example: <code>n = 4</code>, inputs <code>5 9 2 7</code> -> output <code>Largest = 9</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun <code>n</code> ni o'qing.",
      "Keyin <code>n</code> ta butun son o'qing.",
      "Ulardan ENG KATTASINI toping va chiqaring.",
      "Misol: <code>n = 4</code>, kirish <code>5 9 2 7</code> -> natija <code>Largest = 9</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "Затем прочитайте <code>n</code> целых чисел.",
      "Найдите и выведите НАИБОЛЬШЕЕ из них.",
      "Пример: <code>n = 4</code>, ввод <code>5 9 2 7</code> -> вывод <code>Largest = 9</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int largest;
    int x;

    cout << "Largest = " << largest << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    int largest;
    int x;

    cout << "Largest = " << largest << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Cube Function",
    title_uz: "Kub funksiyasi",
    title_ru: "Функция куба",
    en: [
      "Define a function <code>int cube(int x)</code> that returns <code>x * x * x</code>.",
      "In <code>main</code>, read an integer from the user.",
      "Call <code>cube</code> and print: <code>Cube = ...</code>",
      "Example: input <code>4</code> -> output <code>Cube = 64</code>",
    ],
    uz: [
      "<code>x * x * x</code> ni qaytaruvchi <code>int cube(int x)</code> funksiyasini aniqlang.",
      "<code>main</code> da foydalanuvchidan butun son o'qing.",
      "<code>cube</code> ni chaqiring va chiqaring: <code>Cube = ...</code>",
      "Misol: kirish <code>4</code> -> natija <code>Cube = 64</code>",
    ],
    ru: [
      "Определите функцию <code>int cube(int x)</code>, возвращающую <code>x * x * x</code>.",
      "В <code>main</code> прочитайте целое число от пользователя.",
      "Вызовите <code>cube</code> и выведите: <code>Cube = ...</code>",
      "Пример: ввод <code>4</code> -> вывод <code>Cube = 64</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter n: ";
    cin >> n;

    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Count Target in Array Function",
    title_uz: "Massivda nishonni sanash funksiyasi",
    title_ru: "Функция подсчёта вхождений в массиве",
    en: [
      "Define a function <code>int countTarget(int arr[], int n, int target)</code> that returns the count.",
      "In <code>main</code>, declare an array <code>{2, 5, 2, 7, 2, 3}</code> (size 6).",
      "Call <code>countTarget(arr, 6, 2)</code> and print: <code>Count = ...</code>",
      "Expected output: <code>Count = 3</code>",
    ],
    uz: [
      "Hisoblagichni qaytaruvchi <code>int countTarget(int arr[], int n, int target)</code> funksiyasini aniqlang.",
      "<code>main</code> da <code>{2, 5, 2, 7, 2, 3}</code> (o'lcham 6) massivini e'lon qiling.",
      "<code>countTarget(arr, 6, 2)</code> ni chaqiring va chiqaring: <code>Count = ...</code>",
      "Kutilgan natija: <code>Count = 3</code>",
    ],
    ru: [
      "Определите функцию <code>int countTarget(int arr[], int n, int target)</code>, возвращающую количество.",
      "В <code>main</code> объявите массив <code>{2, 5, 2, 7, 2, 3}</code> (размер 6).",
      "Вызовите <code>countTarget(arr, 6, 2)</code> и выведите: <code>Count = ...</code>",
      "Ожидаемый вывод: <code>Count = 3</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {2, 5, 2, 7, 2, 3};

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {2, 5, 2, 7, 2, 3};

    return 0;
}`,
  },

  // =================================================================
  // ADDED JUNE 2026 - 15 new trilingual coding problems
  // (4 easy_medium_starter, 5 control_loop_function, 6 array_or_string_hard)
  // =================================================================
  {
    category: "easy_medium_starter",
    title_en: "Day Name with Switch",
    title_uz: "Hafta Kunini Switch bilan Aniqlash",
    title_ru: "Название дня недели через switch",
    en: [
      "Read an integer <code>d</code> (1-7) from the user.",
      "Use a <code>switch</code> statement to map it to a weekday name (1 = Monday ... 7 = Sunday).",
      "For any other value print <code>Invalid</code>.",
      "Example: input <code>3</code> -> output <code>Day = Wednesday</code>",
    ],
    uz: [
      "Foydalanuvchidan butun son <code>d</code> (1-7) ni o'qing.",
      "<code>switch</code> operatori yordamida uni hafta kuni nomiga moslang (1 = Monday ... 7 = Sunday).",
      "Boshqa har qanday qiymat uchun <code>Invalid</code> chiqaring.",
      "Misol: kirish <code>3</code> -> natija <code>Day = Wednesday</code>",
    ],
    ru: [
      "Прочитайте целое число <code>d</code> (1-7) от пользователя.",
      "С помощью оператора <code>switch</code> сопоставьте его с названием дня недели (1 = Monday ... 7 = Sunday).",
      "Для любого другого значения выведите <code>Invalid</code>.",
      "Пример: ввод <code>3</code> -> вывод <code>Day = Wednesday</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int d;
    cout << "Enter day number (1-7): ";
    cin >> d;

    cout << "Day = ";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int d;
    cout << "Enter day number (1-7): ";
    cin >> d;

    cout << "Day = ";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Swap Two Values Using Pointers",
    title_uz: "Ko'rsatkichlar Yordamida Ikki Qiymatni Almashtirish",
    title_ru: "Обмен двух значений через указатели",
    en: [
      "Write a function <code>void swapValues(int* a, int* b)</code> that swaps the two values via pointers.",
      "In <code>main</code>, read two integers and print them before the swap.",
      "Call <code>swapValues</code>, then print them after the swap.",
      "Example: input <code>4 9</code> -> output <code>Before: 4 9</code> then <code>After: 9 4</code>",
    ],
    uz: [
      "<code>void swapValues(int* a, int* b)</code> funksiyasini yozing, u ikki qiymatni ko'rsatkichlar orqali almashtirsin.",
      "<code>main</code> da ikkita butun son o'qing va almashtirishdan oldin ularni chiqaring.",
      "<code>swapValues</code> ni chaqiring, so'ng almashtirishdan keyin ularni chiqaring.",
      "Misol: kirish <code>4 9</code> -> natija <code>Before: 4 9</code> keyin <code>After: 9 4</code>",
    ],
    ru: [
      "Напишите функцию <code>void swapValues(int* a, int* b)</code>, которая меняет два значения местами через указатели.",
      "В <code>main</code> прочитайте два целых числа и выведите их до обмена.",
      "Вызовите <code>swapValues</code>, затем выведите их после обмена.",
      "Пример: ввод <code>4 9</code> -> вывод <code>Before: 4 9</code>, затем <code>After: 9 4</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

void swapValues(int* a, int* b) {

}

int main() {
    int x, y;
    cout << "Enter two integers: ";
    cin >> x >> y;

    cout << "Before: " << x << " " << y << endl;

    cout << "After: " << x << " " << y << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

void swapValues(int* a, int* b) {

}

int main() {
    int x, y;
    cout << "Enter two integers: ";
    cin >> x >> y;

    cout << "Before: " << x << " " << y << endl;

    cout << "After: " << x << " " << y << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Countdown Using do-while",
    title_uz: "do-while bilan Teskari Sanoq",
    title_ru: "Обратный отсчёт с помощью do-while",
    en: [
      "Read a positive integer <code>n</code> from the user.",
      "Use a <code>do-while</code> loop to print <code>n</code>, then <code>n-1</code>, ... down to 1, each followed by a space.",
      "After the loop print <code>Liftoff!</code> on the same line.",
      "Example: input <code>5</code> -> output <code>5 4 3 2 1 Liftoff!</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son <code>n</code> ni o'qing.",
      "<code>do-while</code> siklidan foydalanib <code>n</code>, keyin <code>n-1</code>, ... 1 gacha har birini bo'sh joy bilan chiqaring.",
      "Sikldan keyin xuddi shu qatorda <code>Liftoff!</code> ni chiqaring.",
      "Misol: kirish <code>5</code> -> natija <code>5 4 3 2 1 Liftoff!</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>n</code> от пользователя.",
      "С помощью цикла <code>do-while</code> выведите <code>n</code>, затем <code>n-1</code>, ... до 1, каждое через пробел.",
      "После цикла выведите <code>Liftoff!</code> в той же строке.",
      "Пример: ввод <code>5</code> -> вывод <code>5 4 3 2 1 Liftoff!</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter start: ";
    cin >> n;

    cout << "Liftoff!" << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter start: ";
    cin >> n;

    cout << "Liftoff!" << endl;
    return 0;
}`,
  },
  {
    category: "easy_medium_starter",
    title_en: "Sum of Squares from 1 to N",
    title_uz: "1 dan N gacha Kvadratlar Yig'indisi",
    title_ru: "Сумма квадратов от 1 до N",
    en: [
      "Read a positive integer <code>N</code> from the user.",
      "Use a <code>for</code> loop to compute 1² + 2² + ... + N².",
      "Display the result.",
      "Example: input <code>4</code> -> output <code>Sum of squares = 30</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son <code>N</code> ni o'qing.",
      "1² + 2² + ... + N² ni hisoblash uchun <code>for</code> siklidan foydalaning.",
      "Natijani chiqaring.",
      "Misol: kirish <code>4</code> -> natija <code>Sum of squares = 30</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>N</code> от пользователя.",
      "С помощью цикла <code>for</code> вычислите 1² + 2² + ... + N².",
      "Выведите результат.",
      "Пример: ввод <code>4</code> -> вывод <code>Sum of squares = 30</code>",
    ],
    hints: [],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter N: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of squares = " << sum << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter N: ";
    cin >> n;

    int sum = 0;

    cout << "Sum of squares = " << sum << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Letter Grade Using Switch",
    title_uz: "Switch bilan Harfli Baho",
    title_ru: "Буквенная оценка через switch",
    en: [
      "Read an integer <code>score</code> (0-100) from the user.",
      "Use a <code>switch</code> on <code>score / 10</code> to choose a letter grade: 90-100 = A, 80-89 = B, 70-79 = C, 60-69 = D, otherwise F.",
      "Display the grade.",
      "Example: input <code>87</code> -> output <code>Grade = B</code>",
    ],
    uz: [
      "Foydalanuvchidan butun son <code>score</code> (0-100) ni o'qing.",
      "<code>score / 10</code> bo'yicha <code>switch</code> ishlatib harfli baho tanlang: 90-100 = A, 80-89 = B, 70-79 = C, 60-69 = D, aks holda F.",
      "Bahoni chiqaring.",
      "Misol: kirish <code>87</code> -> natija <code>Grade = B</code>",
    ],
    ru: [
      "Прочитайте целое число <code>score</code> (0-100) от пользователя.",
      "С помощью <code>switch</code> по <code>score / 10</code> выберите буквенную оценку: 90-100 = A, 80-89 = B, 70-79 = C, 60-69 = D, иначе F.",
      "Выведите оценку.",
      "Пример: ввод <code>87</code> -> вывод <code>Grade = B</code>",
    ],
    hints: [
      { en: "Integer division <code>score / 10</code> turns 87 into 8, 95 into 9, etc.", uz: "Butun bo'lish <code>score / 10</code> 87 ni 8 ga, 95 ni 9 ga aylantiradi.", ru: "Целочисленное деление <code>score / 10</code> превращает 87 в 8, 95 в 9 и т.д." },
      { en: "Group <code>case 10:</code> and <code>case 9:</code> together so both give an A.", uz: "<code>case 10:</code> va <code>case 9:</code> ni birlashtiring, ikkalasi ham A bersin.", ru: "Объедините <code>case 10:</code> и <code>case 9:</code>, чтобы оба давали A." },
      { en: "Use <code>default:</code> for any score below 60 (grade F).", uz: "60 dan past har qanday ball uchun <code>default:</code> dan foydalaning (F bahosi).", ru: "Используйте <code>default:</code> для любого балла ниже 60 (оценка F)." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int score;
    cout << "Enter score (0-100): ";
    cin >> score;

    char grade;

    cout << "Grade = " << grade << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int score;
    cout << "Enter score (0-100): ";
    cin >> score;

    char grade;

    cout << "Grade = " << grade << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Overloaded Area Functions",
    title_uz: "Ortiqcha Yuklangan Yuza Funksiyalari",
    title_ru: "Перегруженные функции площади",
    en: [
      "Define two OVERLOADED functions named <code>area</code>: one taking a single <code>int</code> (square side), another taking two <code>int</code>s (rectangle width and height).",
      "Each returns the corresponding area.",
      "In <code>main</code>, call <code>area(5)</code> and <code>area(4, 6)</code> and print both results.",
      "Expected output: <code>Square area = 25</code> then <code>Rectangle area = 24</code>",
    ],
    uz: [
      "<code>area</code> nomli ikkita ORTIQCHA YUKLANGAN (overloaded) funksiya yarating: biri bitta <code>int</code> qabul qiladi (kvadrat tomoni), ikkinchisi ikkita <code>int</code> (to'rtburchak eni va bo'yi).",
      "Har biri tegishli yuzani qaytarsin.",
      "<code>main</code> da <code>area(5)</code> va <code>area(4, 6)</code> ni chaqiring va ikkala natijani chiqaring.",
      "Kutilgan natija: <code>Square area = 25</code> keyin <code>Rectangle area = 24</code>",
    ],
    ru: [
      "Определите две ПЕРЕГРУЖЕННЫЕ функции с именем <code>area</code>: одна принимает один <code>int</code> (сторона квадрата), другая - два <code>int</code> (ширина и высота прямоугольника).",
      "Каждая возвращает соответствующую площадь.",
      "В <code>main</code> вызовите <code>area(5)</code> и <code>area(4, 6)</code> и выведите оба результата.",
      "Ожидаемый вывод: <code>Square area = 25</code>, затем <code>Rectangle area = 24</code>",
    ],
    hints: [
      { en: "Two functions can share the name <code>area</code> if their parameter lists differ.", uz: "Ikki funksiya parametrlari farq qilsa, <code>area</code> nomini baham ko'rishi mumkin.", ru: "Две функции могут иметь общее имя <code>area</code>, если их списки параметров различаются." },
      { en: "Square area is <code>side * side</code>; rectangle area is <code>width * height</code>.", uz: "Kvadrat yuzasi <code>side * side</code>; to'rtburchak yuzasi <code>width * height</code>.", ru: "Площадь квадрата - <code>side * side</code>; площадь прямоугольника - <code>width * height</code>." },
      { en: "The compiler picks the overload by the number of arguments you pass.", uz: "Kompilyator siz uzatgan argumentlar soniga qarab kerakli funksiyani tanlaydi.", ru: "Компилятор выбирает перегрузку по количеству переданных аргументов." },
    ],
    starter: `#include <iostream>
using namespace std;

// Define two overloaded area(...) functions here


int main() {
    cout << "Square area = " << /* area(5) */ 0 << endl;
    cout << "Rectangle area = " << /* area(4, 6) */ 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

// Define two overloaded area(...) functions here


int main() {
    cout << "Square area = " << /* area(5) */ 0 << endl;
    cout << "Rectangle area = " << /* area(4, 6) */ 0 << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Function Overriding with Shapes",
    title_uz: "Shakllar bilan Funksiyani Qayta Aniqlash",
    title_ru: "Переопределение функции на примере фигур",
    en: [
      "Create a base class <code>Shape</code> with a <code>virtual</code> function <code>draw()</code> that prints <code>Some generic shape</code>.",
      "Create a derived class <code>Circle</code> that OVERRIDES <code>draw()</code> to print <code>Drawing a circle</code>.",
      "In <code>main</code>, call <code>draw()</code> on a <code>Shape</code> object, then through a <code>Shape*</code> pointing to a <code>Circle</code>.",
      "Expected output: <code>Some generic shape</code> then <code>Drawing a circle</code>",
    ],
    uz: [
      "<code>Shape</code> bazaviy sinfini yarating, unda <code>Some generic shape</code> chiqaradigan <code>virtual</code> <code>draw()</code> funksiyasi bo'lsin.",
      "<code>Circle</code> hosila sinfini yarating, u <code>draw()</code> ni QAYTA ANIQLAB (override) <code>Drawing a circle</code> chiqarsin.",
      "<code>main</code> da <code>Shape</code> obyektida <code>draw()</code> ni, so'ng <code>Circle</code> ga ishora qiluvchi <code>Shape*</code> orqali chaqiring.",
      "Kutilgan natija: <code>Some generic shape</code> keyin <code>Drawing a circle</code>",
    ],
    ru: [
      "Создайте базовый класс <code>Shape</code> с <code>virtual</code> функцией <code>draw()</code>, печатающей <code>Some generic shape</code>.",
      "Создайте производный класс <code>Circle</code>, который ПЕРЕОПРЕДЕЛЯЕТ <code>draw()</code> и печатает <code>Drawing a circle</code>.",
      "В <code>main</code> вызовите <code>draw()</code> у объекта <code>Shape</code>, затем через <code>Shape*</code>, указывающий на <code>Circle</code>.",
      "Ожидаемый вывод: <code>Some generic shape</code>, затем <code>Drawing a circle</code>",
    ],
    hints: [
      { en: "Mark the base function <code>virtual</code> so overriding works through a base pointer.", uz: "Bazaviy funksiyani <code>virtual</code> deb belgilang, shunda bazaviy ko'rsatkich orqali override ishlaydi.", ru: "Пометьте базовую функцию как <code>virtual</code>, чтобы переопределение работало через базовый указатель." },
      { en: "The derived <code>draw()</code> must have the same signature as the base one.", uz: "Hosila <code>draw()</code> bazaviysi bilan bir xil imzoga ega bo'lishi kerak.", ru: "Производная <code>draw()</code> должна иметь ту же сигнатуру, что и базовая." },
      { en: "A <code>Shape*</code> pointing to a <code>Circle</code> calls the Circle's version at run time.", uz: "<code>Circle</code> ga ishora qiluvchi <code>Shape*</code> ish vaqtida Circle versiyasini chaqiradi.", ru: "<code>Shape*</code>, указывающий на <code>Circle</code>, во время выполнения вызывает версию из Circle." },
    ],
    starter: `#include <iostream>
using namespace std;

class Shape {
public:
    // declare a virtual draw() that prints "Some generic shape"
};

class Circle : public Shape {
public:
    // override draw() to print "Drawing a circle"
};

int main() {
    Shape s;
    Circle c;
    Shape* ptr = &c;

    // call s.draw() and ptr->draw()
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

class Shape {
public:
    // declare a virtual draw() that prints "Some generic shape"
};

class Circle : public Shape {
public:
    // override draw() to print "Drawing a circle"
};

int main() {
    Shape s;
    Circle c;
    Shape* ptr = &c;

    // call s.draw() and ptr->draw()
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Modify Variable Through a Pointer",
    title_uz: "Ko'rsatkich Orqali O'zgaruvchini O'zgartirish",
    title_ru: "Изменение переменной через указатель",
    en: [
      "Write a function <code>void addTen(int* p)</code> that adds 10 to the value the pointer refers to.",
      "In <code>main</code>, read an integer and print it before the call.",
      "Call <code>addTen(&x)</code>, then print the value after the call.",
      "Example: input <code>7</code> -> output <code>Before = 7</code> then <code>After = 17</code>",
    ],
    uz: [
      "<code>void addTen(int* p)</code> funksiyasini yozing, u ko'rsatkich ishora qilgan qiymatga 10 qo'shsin.",
      "<code>main</code> da butun son o'qing va chaqiruvdan oldin uni chiqaring.",
      "<code>addTen(&x)</code> ni chaqiring, so'ng chaqiruvdan keyin qiymatni chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>Before = 7</code> keyin <code>After = 17</code>",
    ],
    ru: [
      "Напишите функцию <code>void addTen(int* p)</code>, которая прибавляет 10 к значению, на которое ссылается указатель.",
      "В <code>main</code> прочитайте целое число и выведите его до вызова.",
      "Вызовите <code>addTen(&x)</code>, затем выведите значение после вызова.",
      "Пример: ввод <code>7</code> -> вывод <code>Before = 7</code>, затем <code>After = 17</code>",
    ],
    hints: [
      { en: "Inside the function, use <code>*p</code> to reach the variable being pointed to.", uz: "Funksiya ichida ishora qilinayotgan o'zgaruvchiga yetish uchun <code>*p</code> dan foydalaning.", ru: "Внутри функции используйте <code>*p</code>, чтобы обратиться к переменной, на которую указывает указатель." },
      { en: "<code>*p = *p + 10;</code> changes the original variable, not a copy.", uz: "<code>*p = *p + 10;</code> nusxani emas, asl o'zgaruvchini o'zgartiradi.", ru: "<code>*p = *p + 10;</code> меняет исходную переменную, а не копию." },
      { en: "Pass the address with <code>&x</code> when you call the function.", uz: "Funksiyani chaqirganda manzilni <code>&x</code> bilan uzating.", ru: "Передавайте адрес через <code>&x</code> при вызове функции." },
    ],
    starter: `#include <iostream>
using namespace std;

void addTen(int* p) {

}

int main() {
    int x;
    cout << "Enter a number: ";
    cin >> x;

    cout << "Before = " << x << endl;

    cout << "After = " << x << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

void addTen(int* p) {

}

int main() {
    int x;
    cout << "Enter a number: ";
    cin >> x;

    cout << "Before = " << x << endl;

    cout << "After = " << x << endl;
    return 0;
}`,
  },
  {
    category: "control_loop_function",
    title_en: "Print All Divisors of N",
    title_uz: "N ning Barcha Bo'luvchilarini Chiqarish",
    title_ru: "Вывод всех делителей N",
    en: [
      "Read a positive integer <code>N</code> from the user.",
      "Use a <code>for</code> loop with an <code>if</code> to find every divisor of <code>N</code> (numbers that divide it with no remainder).",
      "Print them on one line after the label, each preceded by a space.",
      "Example: input <code>12</code> -> output <code>Divisors: 1 2 3 4 6 12</code>",
    ],
    uz: [
      "Foydalanuvchidan musbat butun son <code>N</code> ni o'qing.",
      "<code>N</code> ning har bir bo'luvchisini (uni qoldiqsiz bo'ladigan sonlar) topish uchun <code>if</code> bilan <code>for</code> siklidan foydalaning.",
      "Ularni yorliqdan keyin bitta qatorda, har birini bo'sh joy bilan chiqaring.",
      "Misol: kirish <code>12</code> -> natija <code>Divisors: 1 2 3 4 6 12</code>",
    ],
    ru: [
      "Прочитайте положительное целое число <code>N</code> от пользователя.",
      "С помощью цикла <code>for</code> с <code>if</code> найдите каждый делитель <code>N</code> (числа, на которые он делится без остатка).",
      "Выведите их в одну строку после метки, каждое с предшествующим пробелом.",
      "Пример: ввод <code>12</code> -> вывод <code>Divisors: 1 2 3 4 6 12</code>",
    ],
    hints: [
      { en: "A number <code>i</code> divides <code>N</code> when <code>N % i == 0</code>.", uz: "<code>i</code> soni <code>N</code> ni <code>N % i == 0</code> bo'lganda bo'ladi.", ru: "Число <code>i</code> делит <code>N</code>, когда <code>N % i == 0</code>." },
      { en: "Loop <code>i</code> from 1 to <code>N</code> inclusive.", uz: "<code>i</code> ni 1 dan <code>N</code> gacha (qo'shib) yuriting.", ru: "Идите циклом <code>i</code> от 1 до <code>N</code> включительно." },
      { en: "Print a space before each divisor so the output matches exactly.", uz: "Natija aniq mos kelishi uchun har bir bo'luvchidan oldin bo'sh joy chiqaring.", ru: "Выводите пробел перед каждым делителем, чтобы вывод точно совпадал." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter N: ";
    cin >> n;

    cout << "Divisors:";

    cout << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "Enter N: ";
    cin >> n;

    cout << "Divisors:";

    cout << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Matrix Total and Diagonal Sum",
    title_uz: "Matritsa Umumiy va Diagonal Yig'indisi",
    title_ru: "Сумма всех элементов и диагонали матрицы",
    en: [
      "Use the 3x3 matrix <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(a)</b> Compute and print the SUM of ALL elements.",
      "<b>(b)</b> Compute and print the sum of the MAIN DIAGONAL (elements <code>m[i][i]</code>).",
      "Expected output: <code>Total = 45</code> then <code>Diagonal = 15</code>",
    ],
    uz: [
      "3x3 matritsadan foydalaning: <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(a)</b> BARCHA elementlarning YIG'INDISINI hisoblab, chiqaring.",
      "<b>(b)</b> ASOSIY DIAGONAL (<code>m[i][i]</code> elementlari) yig'indisini hisoblab, chiqaring.",
      "Kutilgan natija: <code>Total = 45</code> keyin <code>Diagonal = 15</code>",
    ],
    ru: [
      "Используйте матрицу 3x3 <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(а)</b> Вычислите и выведите СУММУ ВСЕХ элементов.",
      "<b>(б)</b> Вычислите и выведите сумму ГЛАВНОЙ ДИАГОНАЛИ (элементы <code>m[i][i]</code>).",
      "Ожидаемый вывод: <code>Total = 45</code>, затем <code>Diagonal = 15</code>",
    ],
    hints: [
      { en: "For the total, use two nested loops over rows and columns.", uz: "Umumiy yig'indi uchun qatorlar va ustunlar bo'yicha ikki ichki sikldan foydalaning.", ru: "Для общей суммы используйте два вложенных цикла по строкам и столбцам." },
      { en: "The main diagonal is where the row index equals the column index.", uz: "Asosiy diagonal - qator indeksi ustun indeksiga teng bo'lgan joy.", ru: "Главная диагональ - там, где индекс строки равен индексу столбца." },
      { en: "One loop <code>for (i...) diag += m[i][i];</code> handles part (b).", uz: "Bitta sikl <code>for (i...) diag += m[i][i];</code> (b) qismni bajaradi.", ru: "Один цикл <code>for (i...) diag += m[i][i];</code> решает часть (б)." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};

    cout << "Total = " << /* total */ 0 << endl;
    cout << "Diagonal = " << /* diagonal */ 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};

    cout << "Total = " << /* total */ 0 << endl;
    cout << "Diagonal = " << /* diagonal */ 0 << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Largest Element in a 2D Matrix",
    title_uz: "2D Matritsadagi Eng Katta Element",
    title_ru: "Наибольший элемент в двумерной матрице",
    en: [
      "Use the 3x3 matrix <code>{{3,9,1},{4,2,8},{7,5,6}}</code>.",
      "<b>(a)</b> Find the LARGEST element and print it.",
      "<b>(b)</b> Print its position as the row and column indexes (0-based).",
      "Expected output: <code>Largest = 9</code> then <code>Position: row 0 col 1</code>",
    ],
    uz: [
      "3x3 matritsadan foydalaning: <code>{{3,9,1},{4,2,8},{7,5,6}}</code>.",
      "<b>(a)</b> ENG KATTA elementni toping va chiqaring.",
      "<b>(b)</b> Uning o'rnini qator va ustun indekslari (0 dan) sifatida chiqaring.",
      "Kutilgan natija: <code>Largest = 9</code> keyin <code>Position: row 0 col 1</code>",
    ],
    ru: [
      "Используйте матрицу 3x3 <code>{{3,9,1},{4,2,8},{7,5,6}}</code>.",
      "<b>(а)</b> Найдите НАИБОЛЬШИЙ элемент и выведите его.",
      "<b>(б)</b> Выведите его позицию - индексы строки и столбца (с 0).",
      "Ожидаемый вывод: <code>Largest = 9</code>, затем <code>Position: row 0 col 1</code>",
    ],
    hints: [
      { en: "Start the maximum with <code>m[0][0]</code> and remember row 0, col 0.", uz: "Maksimumni <code>m[0][0]</code> bilan boshlang va qator 0, ustun 0 ni eslab qoling.", ru: "Начните максимум с <code>m[0][0]</code> и запомните строку 0, столбец 0." },
      { en: "When you find a larger value, store its value AND its <code>i</code>, <code>j</code>.", uz: "Kattaroq qiymat topsangiz, uning qiymatini VA <code>i</code>, <code>j</code> ni saqlang.", ru: "Найдя большее значение, сохраните и его, И его <code>i</code>, <code>j</code>." },
      { en: "Use two nested loops to visit every cell once.", uz: "Har bir katakka bir marta tashrif buyurish uchun ikki ichki sikldan foydalaning.", ru: "Используйте два вложенных цикла, чтобы посетить каждую ячейку один раз." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{3, 9, 1}, {4, 2, 8}, {7, 5, 6}};

    cout << "Largest = " << /* value */ 0 << endl;
    cout << "Position: row " << 0 << " col " << 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{3, 9, 1}, {4, 2, 8}, {7, 5, 6}};

    cout << "Largest = " << /* value */ 0 << endl;
    cout << "Position: row " << 0 << " col " << 0 << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Count Spaces and Length of a Sentence",
    title_uz: "Gapdagi Bo'shliqlar va Uzunlikni Sanash",
    title_ru: "Подсчёт пробелов и длины предложения",
    en: [
      "Read a full line of text with <code>getline(cin, s)</code>.",
      "<b>(a)</b> Count how many SPACE characters it contains and print the count.",
      "<b>(b)</b> Print the TOTAL length of the line (number of characters).",
      "Example: input <code>hello big wide world</code> -> <code>Spaces = 3</code> then <code>Length = 20</code>",
    ],
    uz: [
      "<code>getline(cin, s)</code> bilan to'liq matn qatorini o'qing.",
      "<b>(a)</b> Unda nechta BO'SHLIQ belgisi borligini sanab, chiqaring.",
      "<b>(b)</b> Qatorning UMUMIY uzunligini (belgilar soni) chiqaring.",
      "Misol: kirish <code>hello big wide world</code> -> <code>Spaces = 3</code> keyin <code>Length = 20</code>",
    ],
    ru: [
      "Прочитайте полную строку текста с помощью <code>getline(cin, s)</code>.",
      "<b>(а)</b> Подсчитайте, сколько в ней символов ПРОБЕЛА, и выведите количество.",
      "<b>(б)</b> Выведите ОБЩУЮ длину строки (число символов).",
      "Пример: ввод <code>hello big wide world</code> -> <code>Spaces = 3</code>, затем <code>Length = 20</code>",
    ],
    hints: [
      { en: "Use <code>getline</code> (not <code>cin >> s</code>) so spaces are kept.", uz: "Bo'shliqlar saqlanishi uchun <code>cin >> s</code> emas, <code>getline</code> ishlating.", ru: "Используйте <code>getline</code> (а не <code>cin >> s</code>), чтобы пробелы сохранились." },
      { en: "Loop over the string and compare each character to <code>' '</code>.", uz: "Satr bo'ylab yuring va har bir belgini <code>' '</code> bilan solishtiring.", ru: "Пройдите по строке и сравнивайте каждый символ с <code>' '</code>." },
      { en: "The total length is simply <code>s.length()</code>.", uz: "Umumiy uzunlik - oddiygina <code>s.length()</code>.", ru: "Общая длина - это просто <code>s.length()</code>." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a sentence: ";
    getline(cin, s);

    cout << "Spaces = " << 0 << endl;
    cout << "Length = " << 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a sentence: ";
    getline(cin, s);

    cout << "Spaces = " << 0 << endl;
    cout << "Length = " << 0 << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Search and Count in an Array",
    title_uz: "Massivda Qidirish va Sanash",
    title_ru: "Поиск и подсчёт в массиве",
    en: [
      "Use the array <code>{4, 8, 15, 7, 23, 42}</code> and read a target <code>t</code> from the user.",
      "<b>(a)</b> Print the INDEX of the first occurrence of <code>t</code>, or <code>-1</code> if it is not present.",
      "<b>(b)</b> Count how many elements are STRICTLY GREATER than <code>t</code> and print the count.",
      "Example: input <code>7</code> -> output <code>Index = 3</code> then <code>Greater = 4</code>",
    ],
    uz: [
      "<code>{4, 8, 15, 7, 23, 42}</code> massividan foydalaning va foydalanuvchidan <code>t</code> maqsadli sonini o'qing.",
      "<b>(a)</b> <code>t</code> ning birinchi uchrashi INDEKSINI chiqaring, yo'q bo'lsa <code>-1</code>.",
      "<b>(b)</b> <code>t</code> dan QAT'IY KATTA elementlar nechtaligini sanab, chiqaring.",
      "Misol: kirish <code>7</code> -> natija <code>Index = 3</code> keyin <code>Greater = 4</code>",
    ],
    ru: [
      "Используйте массив <code>{4, 8, 15, 7, 23, 42}</code> и прочитайте целевое число <code>t</code> от пользователя.",
      "<b>(а)</b> Выведите ИНДЕКС первого вхождения <code>t</code> или <code>-1</code>, если его нет.",
      "<b>(б)</b> Подсчитайте, сколько элементов СТРОГО БОЛЬШЕ <code>t</code>, и выведите количество.",
      "Пример: ввод <code>7</code> -> вывод <code>Index = 3</code>, затем <code>Greater = 4</code>",
    ],
    hints: [
      { en: "For (a), loop and <code>break</code> as soon as <code>arr[i] == t</code>.", uz: "(a) uchun sikl yuriting va <code>arr[i] == t</code> bo'lishi bilan <code>break</code> qiling.", ru: "Для (а) идите циклом и делайте <code>break</code>, как только <code>arr[i] == t</code>." },
      { en: "Start the index at <code>-1</code> so a missing target reports correctly.", uz: "Indeksni <code>-1</code> dan boshlang, shunda topilmagan maqsad to'g'ri ko'rsatiladi.", ru: "Начните индекс с <code>-1</code>, чтобы отсутствующая цель сообщалась правильно." },
      { en: "For (b), use a separate counter and check <code>arr[i] > t</code>.", uz: "(b) uchun alohida hisoblagich ishlating va <code>arr[i] > t</code> ni tekshiring.", ru: "Для (б) используйте отдельный счётчик и проверяйте <code>arr[i] > t</code>." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {4, 8, 15, 7, 23, 42};
    int t;
    cout << "Enter target: ";
    cin >> t;

    cout << "Index = " << 0 << endl;
    cout << "Greater = " << 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int arr[6] = {4, 8, 15, 7, 23, 42};
    int t;
    cout << "Enter target: ";
    cin >> t;

    cout << "Index = " << 0 << endl;
    cout << "Greater = " << 0 << endl;
    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Transpose a Square Matrix",
    title_uz: "Kvadrat Matritsani Transponlash",
    title_ru: "Транспонирование квадратной матрицы",
    en: [
      "Use the 3x3 matrix <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(a)</b> Build its TRANSPOSE in a second 3x3 array (swap rows and columns: <code>t[j][i] = m[i][j]</code>).",
      "<b>(b)</b> Print the transpose row by row, values in a row separated by a single space.",
      "Expected output (3 lines): <code>1 4 7</code>, <code>2 5 8</code>, <code>3 6 9</code>",
    ],
    uz: [
      "3x3 matritsadan foydalaning: <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(a)</b> Uning TRANSPONIRLANGANINI ikkinchi 3x3 massivda quring (qator va ustunlarni almashtiring: <code>t[j][i] = m[i][j]</code>).",
      "<b>(b)</b> Transponirlangan matritsani qatorma-qator chiqaring, qatordagi qiymatlar bitta bo'sh joy bilan ajratilsin.",
      "Kutilgan natija (3 qator): <code>1 4 7</code>, <code>2 5 8</code>, <code>3 6 9</code>",
    ],
    ru: [
      "Используйте матрицу 3x3 <code>{{1,2,3},{4,5,6},{7,8,9}}</code>.",
      "<b>(а)</b> Постройте её ТРАНСПОНИРОВАНИЕ во втором массиве 3x3 (поменяйте строки и столбцы: <code>t[j][i] = m[i][j]</code>).",
      "<b>(б)</b> Выведите транспонированную матрицу построчно, значения в строке разделяйте одним пробелом.",
      "Ожидаемый вывод (3 строки): <code>1 4 7</code>, <code>2 5 8</code>, <code>3 6 9</code>",
    ],
    hints: [
      { en: "Use two nested loops with <code>t[j][i] = m[i][j];</code> for part (a).", uz: "(a) qism uchun <code>t[j][i] = m[i][j];</code> bilan ikki ichki sikl ishlating.", ru: "Для части (а) используйте два вложенных цикла с <code>t[j][i] = m[i][j];</code>." },
      { en: "When printing, add a space between values but not after the last in a row.", uz: "Chiqarishda qiymatlar orasiga bo'sh joy qo'ying, lekin qatordagi oxirgisidan keyin emas.", ru: "При выводе ставьте пробел между значениями, но не после последнего в строке." },
      { en: "Print a newline (<code>endl</code>) at the end of each row.", uz: "Har bir qator oxirida yangi qator (<code>endl</code>) chiqaring.", ru: "В конце каждой строки выводите перевод строки (<code>endl</code>)." },
    ],
    starter: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int t[3][3];

    // build the transpose, then print it row by row

    return 0;
}`,
    starter_ru: `#include <iostream>
using namespace std;

int main() {
    int m[3][3] = {{1, 2, 3}, {4, 5, 6}, {7, 8, 9}};
    int t[3][3];

    // build the transpose, then print it row by row

    return 0;
}`,
  },
  {
    category: "array_or_string_hard",
    title_en: "Most Frequent Character in a String",
    title_uz: "Satrdagi Eng Ko'p Uchraydigan Belgi",
    title_ru: "Самый частый символ в строке",
    en: [
      "Read a full line with <code>getline(cin, s)</code>. Consider only lowercase letters <code>a</code>-<code>z</code>.",
      "<b>(a)</b> Find the letter that appears MOST often and print it (on ties, choose the earliest in the alphabet).",
      "<b>(b)</b> Print how many times that letter appears.",
      "Example: input <code>banana</code> -> output <code>Most frequent: a</code> then <code>Count: 3</code>",
    ],
    uz: [
      "<code>getline(cin, s)</code> bilan to'liq qatorni o'qing. Faqat kichik <code>a</code>-<code>z</code> harflarini hisobga oling.",
      "<b>(a)</b> ENG KO'P uchraydigan harfni toping va chiqaring (teng bo'lsa, alifboda eng oldingisini tanlang).",
      "<b>(b)</b> O'sha harf necha marta uchrashini chiqaring.",
      "Misol: kirish <code>banana</code> -> natija <code>Most frequent: a</code> keyin <code>Count: 3</code>",
    ],
    ru: [
      "Прочитайте полную строку с помощью <code>getline(cin, s)</code>. Учитывайте только строчные буквы <code>a</code>-<code>z</code>.",
      "<b>(а)</b> Найдите букву, которая встречается ЧАЩЕ всего, и выведите её (при равенстве выберите самую раннюю в алфавите).",
      "<b>(б)</b> Выведите, сколько раз эта буква встречается.",
      "Пример: ввод <code>banana</code> -> вывод <code>Most frequent: a</code>, затем <code>Count: 3</code>",
    ],
    hints: [
      { en: "Use a <code>int freq[26]</code> array; index a letter with <code>s[i] - 'a'</code>.", uz: "<code>int freq[26]</code> massividan foydalaning; harfni <code>s[i] - 'a'</code> bilan indekslang.", ru: "Используйте массив <code>int freq[26]</code>; индексируйте букву через <code>s[i] - 'a'</code>." },
      { en: "Only count a character when it is between <code>'a'</code> and <code>'z'</code>.", uz: "Belgini faqat <code>'a'</code> va <code>'z'</code> orasida bo'lsa sanang.", ru: "Считайте символ только если он между <code>'a'</code> и <code>'z'</code>." },
      { en: "Scanning <code>freq</code> from index 0 upward gives the earliest letter on a tie.", uz: "<code>freq</code> ni 0-indeksdan yuqoriga qarab ko'rib chiqish teng holatda eng oldingi harfni beradi.", ru: "Просмотр <code>freq</code> от индекса 0 вверх даёт самую раннюю букву при равенстве." },
    ],
    starter: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a string: ";
    getline(cin, s);

    cout << "Most frequent: " << ' ' << endl;
    cout << "Count: " << 0 << endl;
    return 0;
}`,
    starter_ru: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    cout << "Enter a string: ";
    getline(cin, s);

    cout << "Most frequent: " << ' ' << endl;
    cout << "Count: " << 0 << endl;
    return 0;
}`,
  },

];

// ---- Index maps (used by the seeded picker) ----
window.CODING_BANK_IDX = {
  control_loop_function: window.CODING_BANK
    .map((p, i) => (p.category === "control_loop_function" ? i : -1))
    .filter((i) => i !== -1),
  array_or_string: window.CODING_BANK
    .map((p, i) => (p.category === "array_or_string" ? i : -1))
    .filter((i) => i !== -1),
  array_or_string_hard: window.CODING_BANK
    .map((p, i) => (p.category === "array_or_string_hard" ? i : -1))
    .filter((i) => i !== -1),
  easy_medium_starter: window.CODING_BANK
    .map((p, i) => (p.category === "easy_medium_starter" ? i : -1))
    .filter((i) => i !== -1),
};
