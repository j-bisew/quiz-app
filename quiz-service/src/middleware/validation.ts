import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data',
      details: formattedErrors,
    });
    return;
  }
  next();
}

// =============================================
// 🎯 QUIZ VALIDATION (tylko pola quiz)
// =============================================

export const validateQuizFields = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Quiz title must be between 3 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Quiz description must be between 10 and 1000 characters'),
  
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('difficulty')
    .isIn(['EASY', 'MEDIUM', 'HARD'])
    .withMessage('Difficulty must be EASY, MEDIUM, or HARD'),
  
  body('timeLimit')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const num = Number(value);
      if (isNaN(num) || num < 30 || num > 7200) {
        throw new Error('Time limit must be between 30 seconds and 2 hours when provided');
      }
      return true;
    }),
];

// =============================================
// 📝 QUESTION VALIDATION (szczegółowa)
// =============================================

export const validateQuestionFields = [
  body('questions')
    .isArray({ min: 1, max: 50 })
    .withMessage('Quiz must have between 1 and 50 questions'),
  
  // Podstawowe pola pytania
  body('questions.*.title')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Question title must be between 5 and 500 characters'),
  
  body('questions.*.type')
    .isIn(['SINGLE', 'MULTIPLE', 'OPEN'])
    .withMessage('Question type must be SINGLE, MULTIPLE, or OPEN'),
  
  body('questions.*.points')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Question points must be between 1 and 100')
    .default(1),
  
  // Walidacja answers (zawsze tablica)
  body('questions.*.answers')
    .isArray()
    .withMessage('Question answers must be an array'),
  
  // Walidacja correctAnswer (zawsze tablica)
  body('questions.*.correctAnswer')
    .isArray({ min: 1 })
    .withMessage('Question must have at least one correct answer'),
];

// =============================================
// 🔍 SZCZEGÓŁOWA WALIDACJA TYPÓW PYTAŃ
// =============================================

export const validateQuestionTypes = [
  body('questions.*')
    .custom((question, { path }) => {
      const { type, answers, correctAnswer } = question;
      const questionIndex = path.replace('questions[', '').replace(']', '');

      // Set default points if not provided
      if (!question.points) {
        question.points = 1;
      }

      // 🎯 SINGLE - jedna poprawna odpowiedź z listy
      if (type === 'SINGLE') {
        // Musi mieć przynajmniej 2 opcje do wyboru
        if (!Array.isArray(answers) || answers.length < 2) {
          throw new Error(`Question ${questionIndex}: SINGLE type must have at least 2 answer options`);
        }
        
        // Maksymalnie 10 opcji
        if (answers.length > 10) {
          throw new Error(`Question ${questionIndex}: SINGLE type can have maximum 10 answer options`);
        }
        
        // Wszystkie opcje muszą być niepuste stringi
        for (let i = 0; i < answers.length; i++) {
          if (typeof answers[i] !== 'string' || answers[i].trim() === '') {
            throw new Error(`Question ${questionIndex}: All answer options must be non-empty strings`);
          }
        }
        
        // Dokładnie jedna poprawna odpowiedź
        if (!Array.isArray(correctAnswer) || correctAnswer.length !== 1) {
          throw new Error(`Question ${questionIndex}: SINGLE type must have exactly one correct answer`);
        }
        
        // Poprawna odpowiedź musi być w opcjach
        if (!answers.includes(correctAnswer[0])) {
          throw new Error(`Question ${questionIndex}: Correct answer "${correctAnswer[0]}" must be one of the provided options`);
        }
      }

      // 🎯 MULTIPLE - wiele poprawnych odpowiedzi z listy
      else if (type === 'MULTIPLE') {
        // Musi mieć przynajmniej 3 opcje (żeby miało sens wielokrotny wybór)
        if (!Array.isArray(answers) || answers.length < 3) {
          throw new Error(`Question ${questionIndex}: MULTIPLE type must have at least 3 answer options`);
        }
        
        // Maksymalnie 15 opcji
        if (answers.length > 15) {
          throw new Error(`Question ${questionIndex}: MULTIPLE type can have maximum 15 answer options`);
        }
        
        // Wszystkie opcje muszą być niepuste stringi
        for (let i = 0; i < answers.length; i++) {
          if (typeof answers[i] !== 'string' || answers[i].trim() === '') {
            throw new Error(`Question ${questionIndex}: All answer options must be non-empty strings`);
          }
        }
        
        // Przynajmniej jedna poprawna odpowiedź, ale nie wszystkie
        if (!Array.isArray(correctAnswer) || correctAnswer.length < 1) {
          throw new Error(`Question ${questionIndex}: MULTIPLE type must have at least one correct answer`);
        }
        
        if (correctAnswer.length >= answers.length) {
          throw new Error(`Question ${questionIndex}: MULTIPLE type cannot have all options as correct (use SINGLE instead)`);
        }
        
        // Wszystkie poprawne odpowiedzi muszą być w opcjach
        for (const correct of correctAnswer) {
          if (!answers.includes(correct)) {
            throw new Error(`Question ${questionIndex}: Correct answer "${correct}" must be one of the provided options`);
          }
        }
        
        // Nie może być duplikatów w poprawnych odpowiedziach
        const uniqueCorrect = [...new Set(correctAnswer)];
        if (uniqueCorrect.length !== correctAnswer.length) {
          throw new Error(`Question ${questionIndex}: Correct answers cannot contain duplicates`);
        }
      }

      // 🎯 OPEN - otwarta odpowiedź tekstowa
      else if (type === 'OPEN') {
        // Answers powinno być puste (nie ma opcji do wyboru)
        if (!Array.isArray(answers) || answers.length !== 0) {
          throw new Error(`Question ${questionIndex}: OPEN type must have empty answers array (no options to choose from)`);
        }
        
        // Musi mieć przykładowe poprawne odpowiedzi
        if (!Array.isArray(correctAnswer) || correctAnswer.length < 1) {
          throw new Error(`Question ${questionIndex}: OPEN type must have at least one example correct answer`);
        }
        
        // Maksymalnie 5 przykładowych odpowiedzi
        if (correctAnswer.length > 5) {
          throw new Error(`Question ${questionIndex}: OPEN type can have maximum 5 example correct answers`);
        }
        
        // Wszystkie przykładowe odpowiedzi muszą być niepuste stringi
        for (let i = 0; i < correctAnswer.length; i++) {
          if (typeof correctAnswer[i] !== 'string' || correctAnswer[i].trim() === '') {
            throw new Error(`Question ${questionIndex}: All example correct answers must be non-empty strings`);
          }
          
          // Nie może być za długie (max 500 znaków)
          if (correctAnswer[i].length > 500) {
            throw new Error(`Question ${questionIndex}: Example correct answers cannot exceed 500 characters`);
          }
        }
      }

      return true;
    }),
];

// =============================================
// 🎯 VALIDATION FOR CHECK ANSWERS (nowy format)
// =============================================

export const validateCheckAnswers = [
  body('answers')
    .custom((value) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Answers must be an object with question numbers as keys (e.g., {"0": ["answer"], "1": ["answer1", "answer2"]})');
      }
      
      for (const key of Object.keys(value)) {
        if (!/^\d+$/.test(key)) {
          throw new Error('Answer keys must be question numbers (e.g., "0", "1", "2")');
        }
        
        if (!Array.isArray(value[key])) {
          throw new Error(`Answer for question ${key} must be an array of strings`);
        }
        
        for (const answer of value[key]) {
          if (typeof answer !== 'string') {
            throw new Error(`All answers for question ${key} must be strings`);
          }
          
          if (answer.trim() === '') {
            throw new Error(`Answer for question ${key} cannot be empty after trimming spaces`);
          }
          
          if (answer.length > 1000) {
            throw new Error(`Answer for question ${key} cannot exceed 1000 characters`);
          }
        }
        
        if (value[key].length > 20) {
          throw new Error(`Question ${key} cannot have more than 20 answers`);
        }
        
        // Check for duplicates after normalization (but don't modify data)
        const normalizedAnswers = value[key].map((answer: string) => answer.trim().toLowerCase());
        const uniqueNormalized = [...new Set(normalizedAnswers)];
        if (uniqueNormalized.length !== normalizedAnswers.length) {
          throw new Error(`Question ${key} contains duplicate answers after normalization`);
        }
      }
      
      return true;
    }),
  
  body('timeSpent')
    .isInt({ min: 1, max: 7200 })
    .withMessage('Time spent must be between 1 second and 2 hours'),
  
  handleValidationErrors,
];

// =============================================
// 🆕 HELPER FUNCTION - Normalizacja odpowiedzi dla porównania
// =============================================

export function normalizeAnswersForComparison(answers: string[]): string[] {
  return answers
    .map(answer => answer.trim().toLowerCase())
    .filter(answer => answer !== '') // Usuń puste odpowiedzi
    .sort(); // Sortuj dla spójnego porównania
}

// =============================================
// 🔗 COMBINED VALIDATORS
// =============================================

export const validateCreateQuiz = [
  ...validateQuizFields,
  ...validateQuestionFields,
  ...validateQuestionTypes,
  handleValidationErrors,
];

export const validateUpdateQuiz = [
  param('id').isLength({ min: 1 }).withMessage('Quiz ID is required'),
  ...validateQuizFields,
  ...validateQuestionFields,
  ...validateQuestionTypes,
  handleValidationErrors,
];

export const validateSearch = [
  query('pattern')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search pattern must be between 1 and 100 characters'),
  handleValidationErrors,
];

// =============================================
// 🆕 DODATKOWE VALIDATORY
// =============================================

export const validateQuizId = [
  param('id').isLength({ min: 1 }).withMessage('Quiz ID is required'),
  handleValidationErrors,
];

export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors,
];