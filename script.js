const canvas = document.getElementById('roulette-wheel');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spin-button');
const resultDisplay = document.getElementById('result');

// --- 룰렛 설정 ---
const options = ["꽝", "100포인트", "50% 할인", "무료 배송", "다음 기회에", "1000포인트", "음료 쿠폰", "500포인트"];
const colors = ["#FFDDC1", "#FFFACD", "#ADD8E6", "#E6E6FA", "#FFB6C1", "#98FB98", "#F0E68C", "#DDA0DD"]; // 각 항목 색상
// ------------------

const numOptions = options.length;
const arc = (Math.PI * 2) / numOptions; // 각 섹터의 각도 (라디안)
const radius = canvas.width / 2 - 10; // 캔버스 중앙에서 약간 안쪽
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

let currentAngle = 0; // 현재 룰렛 각도
let spinTimeout = null;
let spinAngleStart = 0;
let spinTime = 0;
let spinTimeTotal = 0;
let isSpinning = false;

// 로컬 스토리지 키
const LAST_SPIN_DATE_KEY = 'lastSpinDate';

// 오늘 날짜 문자열 (YYYY-MM-DD 형식)
function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 룰렛 그리기 함수
function drawRouletteWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 캔버스 초기화
    ctx.strokeStyle = '#ffffff'; // 섹터 구분선 색상
    ctx.lineWidth = 2;

    for (let i = 0; i < numOptions; i++) {
        const angle = currentAngle + i * arc; // 각 섹터의 시작 각도
        ctx.fillStyle = colors[i % colors.length]; // 색상 적용

        // 섹터 그리기
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, angle, angle + arc, false); // 외부 원호
        ctx.arc(centerX, centerY, radius * 0.3, angle + arc, angle, true); // 내부 원호 (도넛 형태)
        ctx.closePath(); // 경로 닫기 (중심으로 선을 긋는 대신 내부 원호 사용)
        // ctx.lineTo(centerX, centerY); // 중심선 (파이 형태)
        ctx.fill();
        ctx.stroke();

        // 텍스트 쓰기
        ctx.save(); // 현재 상태 저장 (회전 및 이동 전)
        ctx.fillStyle = "#333"; // 텍스트 색상
        ctx.font = 'bold 14px sans-serif';
        ctx.translate(centerX + Math.cos(angle + arc / 2) * radius * 0.7,
                      centerY + Math.sin(angle + arc / 2) * radius * 0.7);
        ctx.rotate(angle + arc / 2 + Math.PI / 2); // 텍스트가 바깥쪽을 향하도록 회전
        const text = options[i];
        ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
        ctx.restore(); // 저장된 상태 복원
    }
}

// Easing 함수 (점점 느려지는 효과)
function easeOut(t) {
    return 1 - Math.pow(1 - t, 3); // Cubic ease-out
}

// 룰렛 회전 애니메이션 함수
function rotateWheel() {
    const now = Date.now();
    const deltaTime = now - (spinTimeStart || now); // 첫 프레임 또는 이후 프레임 시간 차이
    spinTimeStart = now; // 현재 시간을 시작 시간으로 업데이트

    spinTime += deltaTime; // 총 경과 시간 업데이트

    if (spinTime >= spinTimeTotal) {
        stopRotateWheel(); // 시간이 다 되면 멈춤
        return;
    }

    // Easing 적용하여 회전 각도 계산
    const spinFraction = spinTime / spinTimeTotal;
    const easedFraction = easeOut(spinFraction);
    const distance = spinAngleStart * (Math.PI / 180); // 총 회전해야 할 각도 (라디안)
    // 이전 각도에서 현재 프레임까지 회전해야 할 '추가' 각도 계산 대신,
    // 총 회전 각도에 기반한 현재 각도를 계산하여 부드럽게 만듦
    currentAngle = (initialAngle + distance * easedFraction) % (Math.PI * 2);

    drawRouletteWheel(); // 룰렛 다시 그리기
    spinTimeout = requestAnimationFrame(rotateWheel); // 다음 프레임 요청
}

// 룰렛 멈추는 함수
function stopRotateWheel() {
    cancelAnimationFrame(spinTimeout); // 애니메이션 중지
    isSpinning = false;
    spinButton.disabled = false; // 돌리기 버튼 다시 활성화 (제한 로직에서 다시 비활성화될 수 있음)

    // 최종 각도를 기준으로 당첨 항목 계산
    // 포인터는 상단 중앙 (Math.PI * 1.5 또는 -Math.PI * 0.5 라디안 위치)
    const finalAngle = (currentAngle + Math.PI * 1.5) % (Math.PI * 2) ; // 포인터 위치에 맞게 각도 조정
    const winningIndex = Math.floor(numOptions - (finalAngle / arc)) % numOptions;
    const winningOption = options[winningIndex];

    resultDisplay.textContent = `축하합니다! 🎉 ${winningOption} 당첨!`;

    // 오늘 날짜를 로컬 스토리지에 저장
    localStorage.setItem(LAST_SPIN_DATE_KEY, getTodayDateString());

    // 저장 후 바로 버튼 상태 업데이트 (내일 다시 활성화되도록)
    checkSpinStatus();
}

// 돌리기 버튼 클릭 이벤트 핸들러
function spin() {
    if (isSpinning) return; // 이미 돌고 있으면 무시

    // 참여 가능 여부 확인
    const lastSpinDate = localStorage.getItem(LAST_SPIN_DATE_KEY);
    const todayDate = getTodayDateString();

    if (lastSpinDate === todayDate) {
        alert("룰렛은 하루에 한 번만 돌릴 수 있습니다.");
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    resultDisplay.textContent = "돌아간다~ 돌아간다~ 🎡"; // 결과 메시지 초기화

    // 회전 설정
    spinAngleStart = Math.random() * 360 + 720; // 최소 2바퀴 + 랜덤 추가 회전 (도 단위)
    spinTime = 0;
    spinTimeTotal = Math.random() * 3000 + 5000; // 5초 ~ 8초 사이로 회전
    initialAngle = currentAngle; // 회전 시작 전의 현재 각도 저장
    spinTimeStart = null; // 애니메이션 시작 시간 초기화

    rotateWheel(); // 회전 시작
}

// 페이지 로드 시 참여 가능 상태 확인 함수
function checkSpinStatus() {
    const lastSpinDate = localStorage.getItem(LAST_SPIN_DATE_KEY);
    const todayDate = getTodayDateString();

    if (lastSpinDate === todayDate) {
        spinButton.disabled = true;
        resultDisplay.textContent = "오늘은 이미 참여하셨습니다. 내일 다시 도전하세요!";
    } else {
        spinButton.disabled = false;
        resultDisplay.textContent = "행운의 룰렛을 돌려보세요!"; // 참여 가능 메시지 (선택 사항)
    }
}

// --- 초기화 ---
drawRouletteWheel(); // 페이지 로드 시 초기 룰렛 그리기
checkSpinStatus(); // 참여 가능 상태 확인 및 버튼 활성/비활성 설정
spinButton.addEventListener('click', spin); // 버튼 클릭 리스너 추가
