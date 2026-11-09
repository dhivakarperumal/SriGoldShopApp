import {
  useEffect,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AppAlertButton = {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AppAlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options: AppAlertOptions;
};

const alertQueue: AlertConfig[] = [];
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(subscriber => subscriber());
}

function dismissCurrentAlert() {
  if (alertQueue.length === 0) return;
  const dismissed = alertQueue.shift();
  notifySubscribers();
  dismissed?.options.onDismiss?.();
}

export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options: AppAlertOptions = {},
  ) {
    alertQueue.push({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
      options,
    });
    notifySubscribers();
  },
};

function AppAlertHost() {
  const insets = useSafeAreaInsets();
  const [activeAlert, setActiveAlert] = useState<AlertConfig | null>(
    () => alertQueue[0] ?? null,
  );

  useEffect(() => {
    const updateAlert = () => setActiveAlert(alertQueue[0] ?? null);
    subscribers.add(updateAlert);
    updateAlert();

    return () => {
      subscribers.delete(updateAlert);
    };
  }, []);

  const dismiss = (button?: AppAlertButton) => {
    dismissCurrentAlert();
    if (button?.onPress) {
      button.onPress();
    }
  };

  const handleRequestClose = () => {
    if (activeAlert?.options.cancelable) {
      dismiss(activeAlert.buttons.find(button => button.style === 'cancel'));
    }
  };

  return (
    <Modal
      visible={activeAlert !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRequestClose}
    >
      <View className="flex-1 items-center justify-center bg-black/55 px-6">
        {activeAlert ? (
          <View
            className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#e8d9b8] bg-[#fffdf8] shadow-2xl"
            style={{ marginTop: insets.top * 0.15 }}
            accessibilityViewIsModal
          >
            <View className="h-1 bg-accent" />
            <View className="px-5 pb-2 pt-5">
              <Text className="text-lg font-bold text-primary-dark">
                {activeAlert.title}
              </Text>
              {activeAlert.message ? (
                <Text className="mt-2 text-sm leading-5 text-slate-600">
                  {activeAlert.message}
                </Text>
              ) : null}
            </View>
            <View
              className={`mt-3 border-t border-[#eee5d5] px-4 py-3 ${
                activeAlert.buttons.length > 2
                  ? 'flex-col gap-2'
                  : 'flex-row justify-end gap-2'
              }`}
            >
              {activeAlert.buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const textColor = isDestructive
                  ? '#B42318'
                  : isCancel
                    ? '#64748B'
                    : '#004D40';

                return (
                  <Pressable
                    key={`${button.text || 'button'}-${index}`}
                    className={`min-h-11 items-center justify-center rounded-xl px-4 py-2 active:opacity-70 ${
                      isDestructive
                        ? 'bg-rose-50'
                        : isCancel
                          ? 'bg-slate-100'
                          : 'bg-primary'
                    }`}
                    onPress={() => dismiss(button)}
                    accessibilityRole="button"
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isDestructive || isCancel ? '' : 'text-white'
                      }`}
                      style={
                        isDestructive || isCancel
                          ? { color: textColor }
                          : undefined
                      }
                    >
                      {button.text || 'OK'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

export default AppAlertHost;
