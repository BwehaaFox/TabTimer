import { later } from '@ember/runloop';

/**
 * Генерирует мягкий, но заметный звуковой сигнал уведомления
 * Использует Web Audio API для создания приятного двухтонального сигнала
 *
 * @param {Object} options - Настройки звука
 * @param {number} options.volume - Громкость (0.0 - 1.0), по умолчанию 0.3
 * @param {number} options.duration - Длительность сигнала в мс, по умолчанию 400
 * @param {number} options.firstToneFreq - Частота первого тона в Гц, по умолчанию 523.25 (C5)
 * @param {number} options.secondToneFreq - Частота второго тона в Гц, по умолчанию 659.25 (E5)
 * @param {number} options.gapBetweenTones - Пауза между тонами в мс, по умолчанию 50
 * @returns {Object} Объект с методом abort() для отмены воспроизведения
 */
export function playNotificationSound(options = {}) {
  const {
    volume = 0.3,
    duration = 400,
    firstToneFreq = 523.25, // C5 - приятная средняя частота
    secondToneFreq = 659.25, // E5 - мажорная терция, создаёт позитивный аккорд
    gapBetweenTones = 50,
  } = options;

  // Проверяем поддержку Web Audio API
  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('Web Audio API не поддерживается в этом браузере');
    return { abort: () => {} };
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  let isAborted = false;

  // Создаём аудиоцепочку
  const masterGain = audioContext.createGain();
  masterGain.connect(audioContext.destination);
  masterGain.gain.value = volume;

  const halfDuration = duration / 2 / 1000; // в секундах

  // Первый тон
  const oscillator1 = audioContext.createOscillator();
  oscillator1.type = 'sine'; // Мягкая синусоидальная волна
  oscillator1.frequency.value = firstToneFreq;
  oscillator1.connect(masterGain);

  // Второй тон
  const oscillator2 = audioContext.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.value = secondToneFreq;
  oscillator2.connect(masterGain);

  const startTime = audioContext.currentTime;

  // Огибающая громкости для первого тона (плавное начало и конец)
  masterGain.gain.setValueAtTime(0, startTime);
  masterGain.gain.linearRampToValueAtTime(volume, startTime + 0.01);

  // Запускаем первый тон
  oscillator1.start(startTime);
  oscillator1.stop(startTime + halfDuration);

  // Плавное затухание первого тона
  masterGain.gain.setValueAtTime(volume, startTime + halfDuration - 0.01);
  masterGain.gain.linearRampToValueAtTime(0, startTime + halfDuration);

  // Запускаем второй тон с небольшой паузой
  const secondToneStartTime = startTime + halfDuration + gapBetweenTones / 1000;
  oscillator2.start(secondToneStartTime);
  oscillator2.stop(secondToneStartTime + halfDuration);

  // Плавное нарастание и затухание второго тона
  masterGain.gain.setValueAtTime(0, secondToneStartTime);
  masterGain.gain.linearRampToValueAtTime(volume, secondToneStartTime + 0.01);
  masterGain.gain.setValueAtTime(volume, secondToneStartTime + halfDuration - 0.01);
  masterGain.gain.linearRampToValueAtTime(0, secondToneStartTime + halfDuration);

  // Очистка контекста после завершения
  const cleanupTime = (secondToneStartTime + halfDuration - startTime) * 1000;
  later(() => {
    if (!isAborted) {
      oscillator1.disconnect();
      oscillator2.disconnect();
      masterGain.disconnect();
      audioContext.close();
    }
  }, cleanupTime);

  return {
    /**
     * Отменяет воспроизведение звука
     */
    abort() {
      isAborted = true;
      try {
        oscillator1.stop();
        oscillator2.stop();
      } catch (e) {
        // Игнорируем ошибки, если осцилляторы уже остановлены
      }
      oscillator1.disconnect();
      oscillator2.disconnect();
      masterGain.disconnect();
      audioContext.close();
    },
  };
}

/**
 * Альтернативный вариант - одиночный мягкий сигнал
 *
 * @param {Object} options - Настройки звука
 * @param {number} options.volume - Громкость (0.0 - 1.0), по умолчанию 0.3
 * @param {number} options.duration - Длительность сигнала в мс, по умолчанию 300
 * @param {number} options.frequency - Частота в Гц, по умолчанию 587.33 (D5)
 * @returns {Object} Объект с методом abort() для отмены воспроизведения
 */
export function playSoftBeep(options = {}) {
  const {
    volume = 0.3,
    duration = 300,
    frequency = 587.33, // D5 - приятная средняя частота
  } = options;

  if (!window.AudioContext && !window.webkitAudioContext) {
    console.warn('Web Audio API не поддерживается в этом браузере');
    return { abort: () => {} };
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  let isAborted = false;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  const startTime = audioContext.currentTime;
  const durationSec = duration / 1000;

  // Плавная огибающая (attack-decay)
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(volume, startTime + durationSec * 0.1);
  gainNode.gain.linearRampToValueAtTime(0, startTime + durationSec);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationSec);

  later(() => {
    if (!isAborted) {
      oscillator.disconnect();
      gainNode.disconnect();
      audioContext.close();
    }
  }, duration);

  return {
    abort() {
      isAborted = true;
      try {
        oscillator.stop();
      } catch (e) {
        // Игнорируем ошибки
      }
      oscillator.disconnect();
      gainNode.disconnect();
      audioContext.close();
    },
  };
}
