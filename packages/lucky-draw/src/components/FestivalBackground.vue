<template>
  <div class="sun-glow" aria-hidden="true"></div>

  <div class="lantern lantern-left" aria-hidden="true"></div>
  <div class="lantern lantern-right" aria-hidden="true"></div>

  <div class="mugwort mugwort-left" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </div>
  <div class="mugwort mugwort-right" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
  </div>

  <div class="decor-zongzi zongzi-left" aria-hidden="true">
    <span class="z-body"></span>
    <span class="z-rope"></span>
  </div>
  <div class="decor-zongzi zongzi-right" aria-hidden="true">
    <span class="z-body"></span>
    <span class="z-rope"></span>
  </div>
  <div class="decor-zongzi zongzi-river" aria-hidden="true">
    <span class="z-body"></span>
    <span class="z-rope"></span>
  </div>

  <div class="river river-back" aria-hidden="true"></div>
  <div class="river river-front" aria-hidden="true"></div>

  <div class="dragon-boat" aria-hidden="true">
    <span class="boat-head"></span>
    <span class="boat-body"></span>
    <span class="boat-tail"></span>
    <span class="boat-ridge"></span>
    <span class="boat-paddle paddle-one"></span>
    <span class="boat-paddle paddle-two"></span>
    <span class="boat-paddle paddle-three"></span>
  </div>
</template>

<style scoped>
.sun-glow {
  position: absolute;
  top: 8%;
  left: 50%;
  width: 520px;
  height: 260px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgb(255 236 157 / 28%), transparent 68%);
  transform: translateX(-50%);
  pointer-events: none;
}

.lantern {
  position: absolute;
  z-index: 1;
  top: 22px;
  width: 46px;
  height: 66px;
  border-radius: 24px 24px 28px 28px;
  background: linear-gradient(90deg, #b8402f, #e8643f 45%, #b8402f);
  box-shadow: inset 0 0 0 4px rgb(255 224 139 / 45%);
  animation: float 4s ease-in-out infinite;
}

.lantern::before,
.lantern::after {
  position: absolute;
  left: 50%;
  content: "";
  transform: translateX(-50%);
}

.lantern::before {
  top: -14px;
  width: 1px;
  height: 18px;
  background: rgb(57 75 58 / 38%);
}

.lantern::after {
  bottom: -18px;
  width: 16px;
  height: 18px;
  border-left: 2px solid #b8402f;
  border-right: 2px solid #b8402f;
}

.lantern-left {
  left: 6vw;
}

.lantern-right {
  right: 7vw;
  animation-delay: -1.5s;
}

.river {
  position: absolute;
  right: -10%;
  left: -10%;
  pointer-events: none;
}

.river-back {
  bottom: 54px;
  height: 156px;
  border-radius: 50% 50% 0 0;
  background:
    repeating-linear-gradient(
      -7deg,
      transparent 0 34px,
      rgb(255 255 255 / 28%) 34px 38px,
      transparent 38px 68px
    ),
    linear-gradient(90deg, #cbe6df, #9bc7ba 50%, #c7e0d6);
  opacity: 0.72;
  animation: riverMove 8s ease-in-out infinite alternate;
}

.river-front {
  bottom: -96px;
  height: 220px;
  border-radius: 50% 50% 0 0;
  background:
    repeating-linear-gradient(
      9deg,
      transparent 0 28px,
      rgb(255 255 255 / 38%) 28px 32px,
      transparent 32px 58px
    ),
    linear-gradient(90deg, #96c7ba, #7eb3a7 46%, #a9d2bf);
  opacity: 0.88;
}

.dragon-boat {
  position: absolute;
  z-index: 1;
  right: 9%;
  bottom: 82px;
  width: 270px;
  height: 96px;
  opacity: 0.88;
  animation: boatDrift 6s ease-in-out infinite alternate;
}

.boat-body {
  position: absolute;
  right: 38px;
  bottom: 18px;
  width: 184px;
  height: 36px;
  border-radius: 8px 8px 32px 42px;
  background: linear-gradient(180deg, #c94734, #822a25);
  box-shadow: inset 0 -9px 0 rgb(60 35 24 / 20%);
}

.boat-ridge {
  position: absolute;
  right: 56px;
  bottom: 46px;
  width: 132px;
  height: 7px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f1b84f, #ffe39b, #f1b84f);
}

.boat-head {
  position: absolute;
  right: 6px;
  bottom: 34px;
  width: 56px;
  height: 50px;
  border-radius: 22px 30px 14px 24px;
  background: linear-gradient(135deg, #d9563d, #f1b84f);
  transform: rotate(9deg);
}

.boat-head::before {
  position: absolute;
  top: 12px;
  right: 13px;
  width: 8px;
  height: 8px;
  content: "";
  border-radius: 999px;
  background: #1c2d24;
}

.boat-head::after {
  position: absolute;
  right: -4px;
  bottom: 7px;
  width: 18px;
  height: 9px;
  content: "";
  border-radius: 999px;
  background: #f4d07c;
  transform: rotate(-12deg);
}

.boat-tail {
  position: absolute;
  left: 14px;
  bottom: 30px;
  width: 54px;
  height: 44px;
  clip-path: polygon(0 50%, 100% 0, 78% 50%, 100% 100%);
  background: linear-gradient(135deg, #b8402f, #f1b84f);
}

.boat-paddle {
  position: absolute;
  bottom: 6px;
  width: 62px;
  height: 5px;
  border-radius: 999px;
  background: #80542d;
}

.boat-paddle::after {
  position: absolute;
  right: -10px;
  top: -8px;
  width: 21px;
  height: 21px;
  content: "";
  border-radius: 999px 999px 4px 999px;
  background: #d49a50;
}

.paddle-one {
  left: 66px;
  transform: rotate(23deg);
}

.paddle-two {
  left: 124px;
  transform: rotate(18deg);
}

.paddle-three {
  left: 182px;
  transform: rotate(14deg);
}

.mugwort {
  position: absolute;
  z-index: 1;
  width: 92px;
  height: 146px;
  opacity: 0.54;
  pointer-events: none;
}

.mugwort span {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 10px;
  height: 120px;
  border-radius: 999px;
  background: #5a8f5d;
  transform-origin: bottom center;
}

.mugwort span::before,
.mugwort span::after {
  position: absolute;
  width: 34px;
  height: 16px;
  content: "";
  border-radius: 70% 0 70% 0;
  background: #78a964;
}

.mugwort span::before {
  top: 22px;
  left: -28px;
  transform: rotate(-18deg);
}

.mugwort span::after {
  top: 52px;
  left: 6px;
  transform: rotate(18deg) scaleX(-1);
}

.mugwort span:nth-child(1) {
  transform: translateX(-50%) rotate(-16deg);
}

.mugwort span:nth-child(2) {
  height: 138px;
  transform: translateX(-50%);
}

.mugwort span:nth-child(3) {
  transform: translateX(-50%) rotate(16deg);
}

.mugwort-left {
  left: 8%;
  bottom: 19%;
}

.mugwort-right {
  right: 14%;
  bottom: 27%;
  transform: scale(0.78) rotate(12deg);
}

.decor-zongzi {
  position: absolute;
  z-index: 1;
  width: 88px;
  height: 88px;
  opacity: 0.76;
  filter: drop-shadow(0 14px 18px rgb(35 84 50 / 16%));
  pointer-events: none;
}

.z-body {
  position: absolute;
  inset: 8px;
  clip-path: polygon(50% 0, 98% 86%, 3% 86%);
  border-radius: 40% 40% 14px 14px;
  background:
    repeating-linear-gradient(-14deg, transparent 0 12px, rgb(255 255 255 / 12%) 12px 14px, transparent 14px 24px),
    linear-gradient(150deg, #93be5b, #2c7d42 58%, #145437);
}

.z-rope {
  position: absolute;
  left: 14px;
  top: 48px;
  width: 60px;
  height: 5px;
  border-radius: 999px;
  background: linear-gradient(90deg, #efd17a, #a4772d, #efd17a);
  transform: rotate(-8deg);
}

.zongzi-left {
  left: 15%;
  bottom: 31%;
  transform: rotate(-18deg);
}

.zongzi-right {
  right: 12%;
  top: 25%;
  transform: rotate(18deg) scale(0.82);
}

.zongzi-river {
  left: 35%;
  bottom: 72px;
  transform: rotate(10deg) scale(0.72);
}

@keyframes riverMove {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(12px);
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) rotate(-1deg);
  }

  50% {
    transform: translateY(10px) rotate(1deg);
  }
}

@keyframes boatDrift {
  from {
    transform: translateX(-8px) translateY(0);
  }

  to {
    transform: translateX(10px) translateY(8px);
  }
}

@media (max-width: 760px) {
  .lantern {
    width: 36px;
    height: 52px;
  }

  .river-back {
    bottom: 48px;
    height: 132px;
  }

  .river-front {
    bottom: -88px;
    height: 196px;
  }

  .dragon-boat {
    right: -54px;
    bottom: 58px;
    transform: scale(0.68);
    transform-origin: right bottom;
  }

  .mugwort {
    opacity: 0.38;
    transform: scale(0.68);
    transform-origin: bottom center;
  }

  .mugwort-left {
    left: -22px;
    bottom: 25%;
  }

  .mugwort-right {
    right: -18px;
    bottom: 35%;
  }

  .decor-zongzi {
    width: 68px;
    height: 68px;
    opacity: 0.64;
  }

  .zongzi-left {
    left: 8px;
    bottom: 34%;
  }

  .zongzi-right {
    right: 4px;
    top: 30%;
  }

  .zongzi-river {
    left: 30%;
    bottom: 54px;
  }
}
</style>
