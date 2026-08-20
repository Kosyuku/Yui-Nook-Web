import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./DayPath.css";

/* DayPath — 把一天摊成一条散步的路，事件是路上的图钉。
 *
 * 移植自 timepaw (MIT, https://github.com/algae1217aglae-ui/timepaw)。
 * 原版是单文件 + getElementById + 全局 setInterval，这里改成受控组件：
 *   - 尺寸从容器量（ResizeObserver），不是 innerWidth/innerHeight，
 *     因为这层活在 .drift-app 里面而不是视口里。
 *   - 定时器和监听都跟着组件卸载清掉。
 *   - 弹窗用 state 渲染，不再 innerHTML 拼串（顺带省掉原版的 esc()）。
 * 路的算法（mulberry32 种子 + Catmull-Rom 平滑）原样保留。
 */

const PIN_MERGE_PX = 18; // 图钉的宽度，比这个还近就会叠在一起

// mulberry32：小、够乱、同种子必定同结果
function dpRand(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 当天的路（一串 0~1 的锚点）。中间几个点左右来回摆，y 一路往下 = 时间往前走。
// 用日期当种子，所以同一天不管重渲染几次都是同一条，过了午夜换一条新的。
function dpNodesFor(day) {
  const rnd = dpRand(day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate());
  // 连转折的「数量」都随机（3~5 个），不然每天的骨架都一样，看久了会发现规律
  const n = 3 + Math.floor(rnd() * 3);
  const pts = [[0.05, 0.12]];
  let right = rnd() < 0.5;
  for (let i = 1; i <= n; i++) {
    const y = 0.12 + (0.94 - 0.12) * (i / (n + 1)) + (rnd() - 0.5) * 0.08;
    // 大部分时候左右交替，但留两成机率待在同一边——连续同侧会拉出一个很开的大弯，
    // 那种不规则才像人走出来的路
    if (i > 1 && rnd() > 0.2) right = !right;
    const amp = 0.22 + rnd() * 0.24; // 这一弯荡多开，每个转折都不一样
    let x = right ? 0.5 + amp : 0.5 - amp;
    // 上半段甩到够边边，把中间那块留给内容
    if (y < 0.55) x = right ? Math.max(x, 0.84) : Math.min(x, 0.16);
    pts.push([Math.min(0.96, Math.max(0.04, x)), Math.min(0.94, Math.max(0.04, y))]);
  }
  pts.push([0.95, 0.95]);
  return pts;
}

// 把锚点接成平滑曲线（Catmull-Rom 换算成 cubic bezier），随机出来的路也永远圆顺、不会有折角
function dpSmooth(pts, W, H) {
  const P = pts.map((p) => [p[0] * W, p[1] * H]);
  let d = `M ${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2] || P[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function hhmm(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DayPath({ items = [], day }) {
  const rootRef = useRef(null);
  const restRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);
  const [geom, setGeom] = useState(null);
  const [popup, setPopup] = useState(null);

  // 当天的 00:00。day 不给就是今天。
  const dayStart = useMemo(() => {
    const d = day ? new Date(day) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [day]);

  const pathD = useMemo(() => {
    if (size.w < 40 || size.h < 40) return "";
    return dpSmooth(dpNodesFor(dayStart), size.w, size.h);
  }, [size.w, size.h, dayStart]);

  // 尺寸从容器量，不是视口
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 那颗点自己会走：每分钟重算一次
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // pathD 落到 DOM 之后才量得到长度，所以几何是第二趟算的
  useEffect(() => {
    const rest = restRef.current;
    if (!rest || !pathD) {
      setGeom(null);
      return;
    }
    const total = rest.getTotalLength();
    if (!total) return;

    // 一天的进度：从当天 00:00 到现在占 24 小时的几成。看的不是今天就当整天走完。
    const elapsed = (Date.now() - dayStart.getTime()) / 86400000;
    const walked = total * Math.max(0, Math.min(1, elapsed));
    const at = (l) => rest.getPointAtLength(Math.max(0, Math.min(total, l)));

    // 几分钟内连着发生的事在路上会挤成一坨，先照「画出来会不会叠到」分组
    const groups = [];
    for (const item of items) {
      const f = (new Date(item.ts).getTime() - dayStart.getTime()) / 86400000;
      if (!(f >= 0 && f <= 1)) continue;
      const d = total * f;
      const last = groups[groups.length - 1];
      if (last && d - last.d < PIN_MERGE_PX) {
        last.items.push(item);
        last.d = d;
      } else {
        groups.push({ d, items: [item] });
      }
    }

    setGeom({
      total,
      walked,
      // 虚线只留「还没走到」的那段：开头先用「0 长实线 + 走过那么长的空白」把前半整段跳掉，
      // 后面才开始正常的虚线节奏。重复次数要铺满剩下的路，否则 pattern 会绕回来从头再空一次。
      restDash: `0 ${walked.toFixed(1)} ` + "2 7 ".repeat(Math.ceil((total - walked) / 9) + 1),
      walkedDash: `${walked.toFixed(1)} ${total.toFixed(1)}`,
      start: at(0),
      end: at(total),
      head: at(walked),
      nodes: groups.map((group) => ({ point: at(group.d), items: group.items })),
    });
  }, [pathD, items, tick, dayStart]);

  const viewBox = size.w && size.h ? `0 0 ${size.w} ${size.h}` : undefined;

  return (
    <div className="dp-root" ref={rootRef}>
      {/* 路本身：整层穿透，落在页面内容底下 */}
      <div className="dp-path-layer" aria-hidden="true">
        <svg viewBox={viewBox} preserveAspectRatio="none">
          <path
            ref={restRef}
            className="dp-line-rest"
            d={pathD}
            style={geom ? { strokeDasharray: geom.restDash } : undefined}
          />
          <path
            className="dp-line-walked"
            d={pathD}
            style={geom ? { strokeDasharray: geom.walkedDash } : undefined}
          />
          {geom ? (
            <>
              {/* 路的两头：起点实心、终点空心 */}
              <circle className="dp-end" cx={geom.start.x.toFixed(1)} cy={geom.start.y.toFixed(1)} r="4.5" />
              <circle className="dp-end-o" cx={geom.end.x.toFixed(1)} cy={geom.end.y.toFixed(1)} r="4.5" />
              {/* 现在走到哪：实线的尽头一颗会呼吸的点 */}
              {geom.walked > 2 ? (
                <>
                  <circle className="dp-now-ring" cx={geom.head.x.toFixed(1)} cy={geom.head.y.toFixed(1)} r="5" />
                  <circle className="dp-now" cx={geom.head.x.toFixed(1)} cy={geom.head.y.toFixed(1)} r="3.2" />
                </>
              ) : null}
            </>
          ) : null}
        </svg>
      </div>

      {/* 图钉另起一层，永远在最上面：它们是这里唯一吃手指的东西 */}
      <div className="dp-hit-layer">
        <svg viewBox={viewBox} preserveAspectRatio="none">
          {(geom?.nodes || []).map((node, index) => {
            const { x, y } = node.point;
            const count = node.items.length;
            return (
              <g key={node.items[0]?.id ?? index}>
                <text className="dp-node" x={x.toFixed(1)} y={(y - 4).toFixed(1)}>📌</text>
                {count > 1 ? (
                  <>
                    <circle className="dp-node-n" cx={(x + 8).toFixed(1)} cy={(y - 17).toFixed(1)} r="6" />
                    <text className="dp-node-nt" x={(x + 8).toFixed(1)} y={(y - 15).toFixed(1)}>{count}</text>
                  </>
                ) : null}
                <circle
                  className="dp-node-hit"
                  cx={x.toFixed(1)}
                  cy={(y - 10).toFixed(1)}
                  r="13"
                  onClick={() => setPopup(node.items)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {popup?.length ? (
        <div
          className="dp-pop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPopup(null);
          }}
        >
          <div className="dp-pop-card">
            {popup.map((item, index) => (
              <div className="dp-one" key={item.id ?? `${item.ts}-${index}`}>
                <div className="dp-time">{hhmm(item.ts)}</div>
                <div className="dp-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
