import { Truck, ShieldCheck, MessageCircle, Clock3 } from "lucide-react";

const points = [
  {
    icon: Truck,
    title: "本地配送",
    description: "涵盖周边地区，也可门市自取",
  },
  {
    icon: ShieldCheck,
    title: "新鲜保证",
    description: "每日新鲜到货，品质严格把关",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp下单",
    description: "下单后自动生成订单信息，专人跟进",
  },
  {
    icon: Clock3,
    title: "快速处理",
    description: "订单即时保存，第一时间为您准备",
  },
];

export function TrustSection() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {points.map((point) => (
        <div key={point.title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 text-gold-700">
            <point.icon className="h-5 w-5" />
          </span>
          <p className="font-display text-sm font-semibold text-ink-900">{point.title}</p>
          <p className="text-xs text-ink-500">{point.description}</p>
        </div>
      ))}
    </div>
  );
}
