import { StyleSheet, View } from 'react-native';

export function MenuIcon({
  color = '#004D40',
  accentColor = '#D4A017',
}: {
  color?: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.menuContainer}>
      <View style={[styles.menuBarTop, { backgroundColor: color }]} />
      <View style={[styles.menuBarMid, { backgroundColor: accentColor }]} />
      <View style={[styles.menuBarBottom, { backgroundColor: color }]} />
    </View>
  );
}

export function BellIcon({
  color = '#004D40',
  clapperColor = '#D4A017',
}: {
  color?: string;
  clapperColor?: string;
}) {
  return (
    <View style={styles.centerBox}>
      {/* Top hanger ring */}
      <View style={[styles.bellHanger, { borderColor: color }]} />
      {/* Bell dome */}
      <View style={[styles.bellDome, { backgroundColor: color }]} />
      {/* Rim / flare */}
      <View style={[styles.bellRim, { backgroundColor: color }]} />
      {/* Clapper */}
      <View style={[styles.bellClapper, { backgroundColor: clapperColor }]} />
    </View>
  );
}

export function DashboardIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  const s = (size - 3) / 2;
  const squareStyle = { width: s, height: s, borderRadius: 3, backgroundColor: color };

  return (
    <View style={[styles.justifyBetween, { width: size, height: size }]}>
      <View style={styles.rowBetween}>
        <View style={squareStyle} />
        <View style={[squareStyle, styles.opacity70]} />
      </View>
      <View style={styles.rowBetween}>
        <View style={[squareStyle, styles.opacity70]} />
        <View style={squareStyle} />
      </View>
    </View>
  );
}

export function OrdersIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.bagHandle, { borderColor: color }]} />
      <View style={[styles.bagBody, { borderColor: color }]}>
        <View style={[styles.bagLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function BillingIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.billingReceipt, { borderColor: color }]}>
        <View style={[styles.billingLine1, { backgroundColor: color }]} />
        <View style={[styles.billingLine2, { backgroundColor: color }]} />
        <View style={[styles.billingLine3, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function LoansIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.loansRoof, { backgroundColor: color }]} />
      <View style={styles.loansColumnsRow}>
        <View style={[styles.loansCol, { backgroundColor: color }]} />
        <View style={[styles.loansCol, { backgroundColor: color }]} />
        <View style={[styles.loansCol, { backgroundColor: color }]} />
      </View>
      <View style={[styles.loansBase, { backgroundColor: color }]} />
    </View>
  );
}

export function ProductsIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.gemShape, { borderColor: color }]} />
    </View>
  );
}

export function MoreIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.moreRow, { width: size, height: size }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

export function ProfileIcon({
  color = '#004D40',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.profileHead, { backgroundColor: color }]} />
      <View style={[styles.profileBody, { backgroundColor: color }]} />
    </View>
  );
}

export function LogoutIcon({
  color = '#DC2626',
  size = 18,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.logoutRow, { width: size, height: size }]}>
      <View style={[styles.doorFrame, { borderColor: color }]} />
      <View style={styles.arrowRow}>
        <View style={[styles.arrowShaft, { backgroundColor: color }]} />
        <View style={[styles.arrowHead, { borderColor: color }]} />
      </View>
    </View>
  );
}

export function CloseIcon({
  color = '#64748B',
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View
        style={[
          styles.closeCross,
          styles.rotate45,
          { width: size, backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.closeCross,
          styles.rotateMinus45,
          { width: size, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function ChevronRightIcon({
  color = '#94A3B8',
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <View style={[styles.chevronHead, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  justifyBetween: {
    justifyContent: 'space-between',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  opacity70: {
    opacity: 0.7,
  },
  menuContainer: {
    width: 20,
    height: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  menuBarTop: {
    width: 18,
    height: 2.2,
    borderRadius: 2,
    marginBottom: 3.5,
  },
  menuBarMid: {
    width: 12,
    height: 2.2,
    borderRadius: 2,
    marginBottom: 3.5,
  },
  menuBarBottom: {
    width: 16,
    height: 2.2,
    borderRadius: 2,
  },
  bellHanger: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1.5,
    marginBottom: -1.5,
  },
  bellDome: {
    width: 14,
    height: 9.5,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  bellRim: {
    width: 17,
    height: 2.2,
    borderRadius: 1.5,
    marginTop: 0.5,
  },
  bellClapper: {
    width: 5,
    height: 2.8,
    borderBottomLeftRadius: 2.5,
    borderBottomRightRadius: 2.5,
    marginTop: 0.5,
  },
  bagHandle: {
    width: 7,
    height: 4.5,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    marginBottom: -1,
  },
  bagBody: {
    width: 15,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagLine: {
    width: 7,
    height: 1.5,
    borderRadius: 1,
  },
  billingReceipt: {
    width: 13,
    height: 16,
    borderRadius: 2.5,
    borderWidth: 1.5,
    padding: 2,
    justifyContent: 'space-around',
  },
  billingLine1: {
    width: 6,
    height: 1.5,
    borderRadius: 1,
  },
  billingLine2: {
    width: 7,
    height: 1.5,
    borderRadius: 1,
  },
  billingLine3: {
    width: 4,
    height: 1.5,
    borderRadius: 1,
  },
  loansRoof: {
    width: 16,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: 1.5,
  },
  loansColumnsRow: {
    width: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loansCol: {
    width: 2.5,
    height: 7,
    borderRadius: 1,
  },
  loansBase: {
    width: 16,
    height: 2.5,
    borderRadius: 1.5,
    marginTop: 1.5,
  },
  gemShape: {
    width: 11,
    height: 11,
    borderWidth: 1.6,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  profileHead: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 1.5,
  },
  profileBody: {
    width: 14,
    height: 6,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorFrame: {
    width: 8,
    height: 14,
    borderTopWidth: 1.8,
    borderBottomWidth: 1.8,
    borderLeftWidth: 1.8,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -3,
  },
  arrowShaft: {
    width: 7,
    height: 1.8,
  },
  arrowHead: {
    width: 5,
    height: 5,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    transform: [{ rotate: '45deg' }],
    marginLeft: -3,
  },
  closeCross: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  rotate45: {
    transform: [{ rotate: '45deg' }],
  },
  rotateMinus45: {
    transform: [{ rotate: '-45deg' }],
  },
  chevronHead: {
    width: 6,
    height: 6,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    transform: [{ rotate: '45deg' }],
    marginLeft: -2,
  },
});
