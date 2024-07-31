const webSocket = new WebSocket('ws://localhost:80');

const languagesContent = document.getElementById("language");
const startBtn = document.getElementById("startBtn");
const text = document.getElementById("text");
const textAbove = document.getElementById("textAbove");
const numMis = document.getElementById("numMis");
const timeLabel = document.getElementById("time");
const miss = document.getElementById("miss");
const timeResultsLabel = document.getElementById("timeResultsLabel");
const media = document.getElementById("media");
const precision = document.getElementById("precision");
const gameWindow = document.getElementById("gameWindow");
const chooseEnemyWindow = document.getElementById('choose-enemy-content');
const chooseEnemy = document.getElementById('choose-enemy');
const loading = document.getElementById('loading');
const loginWindow = document.getElementById("input-content-login");
const signupWindow = document.getElementById("signUp-window");
const loadingWindow = document.getElementById("loading-content");
const counterContent = document.getElementById("counter-content");
const nameLogin = document.getElementById('nameInput-login');
const passwordLogin = document.getElementById('passwordInput-login');
const nameSign = document.getElementById('nameInput-sign');
const passwordSign = document.getElementById('passwordInput-sign');
const counter = document.getElementById("counter");
const enemyText = document.getElementById("enemyText");
const resultsContent = document.getElementById("resultsContent");
const requests = document.getElementById("requests");
const resultImg = document.getElementById("resultImg");
const resultText = document.getElementById("resultText");
const computerContent = document.getElementById("computer-content");
const diffChoose = document.getElementById("diff-choose");
const rematchBtn = document.getElementById("rematch");
const newOpo = document.getElementById("newOpo");
const playAgain = document.getElementById("playAgain");
const goBack = document.getElementById("goBack");
const rankWindow = document.getElementById("rank-content");
const rank = document.getElementById("rank");

//              0 - login      1 - enemy       2 - loading     3 - results     4 - counter    5 - main   6 - requests  7 - computer   8 - signUp    9 - rank

var windows = [loginWindow, chooseEnemyWindow, loadingWindow, resultsContent, counterContent, gameWindow, requests, computerContent, signupWindow, rankWindow]


var lost = false
var textCount = 0
var selectedLanguage = "Portuguese"
var texts = {}
var actualText
var actualTextLen
var numMistakes = 0
var mistakesPercentage = []
var actualLetter = 0
var letterState = []
var writing = false
var actualTime = 0
var finish = false
var correctLetters = 0
var timeManager
var requestTimers = []
var requestId = 0
var selectedDiff = 0
var computerActualLetter = 0
var computerSpeed
var computerMissChance = 1
var computer = false
var userName = ""
var translateValue = 50





// -----------------LOGIN PAGE-----------------------






function logIn() {
    actualWindow([0])
}
function signUp() {
    actualWindow([8])
}
function submitLogin() {
    if (nameLogin.value !== "" && languagesContent.value !== "" && passwordLogin.value !== "") {
        let loginInfo = ["login", nameLogin.value, passwordLogin.value, selectedLanguage]
        userName = nameLogin.value
        sendMessage('register', loginInfo)
    }
}
function submitSignUp() {
    if (nameSign.value !== "" && passwordSign.value !== "") {
        let SignInfo = ["signup", nameSign.value, passwordSign.value]
        sendMessage('register', SignInfo)
    }
}
function againstComputer() {
    actualWindow([7])
}





// ------------------SERVER-CLIENT-------------------






webSocket.onmessage = function (e) {
    const info = JSON.parse(e.data);
    if (info.type === 'login') {

        actualWindow([1, 6]);

    } else if (info.type === 'textCount') {

        textCount = info.content

    } else if (info.type === 'enemyList') {

        let data = info.content;
        chooseEnemy.innerHTML = "";
        data.forEach(enemy => {
            chooseEnemy.innerHTML += `  <div class="enemy" onclick="offerRequest('${enemy.id}')">
                                            <div class="enemy-left">
                                                <div>
                                                    <p>Name :</p>
                                                    <p id="enemyName">${enemy.name}</p>
                                                </div>
                                                <div>
                                                    <p>Language :</p>
                                                    <p id="enemyLanguage">${enemy.language}</p>
                                                </div>
                                            </div>
                                            <div class="enemy-right">
                                                <div class="ball ${enemy.active ? "red" : "green"}"></div>
                                                <p id="enemyState">${enemy.active ? "Playing" : "Online"}</p>
                                            </div>
                                        </div>`
        });

    } else if (info.type === 'rankList') {
        let position = 1
        let data = info.content;
        rank.innerHTML = "";
        data.forEach(player => {
            let positionClass = '';
            if (position === 1) {
                positionClass = 'first';
            } else if (position === 2) {
                positionClass = 'second';
            } else if (position === 3) {
                positionClass = 'third';
            }    

            rank.innerHTML += `  <div class="player">
                                            <div class="player-left">
                                                <div>
                                                    <p>Position :</p>
                                                    <p id="playerPositionRank" class="${positionClass}">${position}</p>
                                                </div>
                                                <div>
                                                    <p>Name :</p>
                                                    <p id="playerNameRank">${player.username}</p>
                                                </div>
                                            </div>
                                            <div class="player-right">
                                                <p>Max speed :</p>
                                                <p class="record" id="record">${player.media}</p>
                                                <p>letters/second</p>
                                            </div>
                                        </div> `
            position++;
        });

    } else if (info.type === 'request') {
        let data = info.content;
        requests.innerHTML += ` <div class="request" id="${requestId}">
                                <div class="request-left">
                                    <div>
                                        <p>Name :</p>
                                        <p id="requestName">${data.name}</p>
                                    </div>
                                    <div>
                                        <p>Language :</p>
                                        <p id="requestLanguage">${data.language}</p>
                                    </div>
                                </div>
                                <div class="request-right">
                                    <div>
                                        <figure>
                                            <img onclick="acceptRequest('${data.id}')" src="assets/imgs/accept.png" alt="Button accept request">
                                        </figure>
                                        <figure>
                                            <img onclick="refuseRequest('${data.id}', ${requestId})" src="assets/imgs/refuse.png" alt="Button refuse request">
                                        </figure>
                                    </div>
                                </div>
                            </div>`
        createTimerRequest(requestId)
        requestId++;

    } else if (info.type === 'refused') {

        console.log("He doesnt wanna play");

    } else if (info.type === 'left') {

        resetGame();
        actualWindow([1, 6]);
        alert("Your opponent has been disconnected :(")

    } else if (info.type === 'gameStart') {

        actualWindow([4, 5]);
        resetGame();
        startGame();

    } else if (info.type === 'updateEnemyText') {

        enemyText.innerHTML = info.content

    } else if (info.type === 'reMatchOffer') {

        rematchBtn.innerHTML = "Accept Rematch"

    } else if (info.type === 'lose') {

        console.log("You lose")
        displayFinishScreen();
        lost = true

    } else if (info.type === 'notRematch') {

        resetGame()
        actualWindow([1, 6]);
    } else if (info.type === 'changeName') {
        alert("This username already exists. Please select another.");
    } else if (info.type === 'signedUp') {
        alert("You signed up succesfully. Reload page and do login");
    } else if (info.type === 'loginFailed') {
        alert("Login Failed. The username or password is wrong");
    }

};

function createTimerRequest(id) {
    requestTimers[id] = 0
    const timer = setInterval(() => {
        requestTimers[id]++
        if (requestTimers[id] >= 10) {
            const request = document.getElementById(id);
            if (request) {
                request.remove();
            }
            clearInterval(timer);
        }
    }, 1000);
}







// ----------------MANAGE PAGE-------------------







for (let index = 1; index <= 20; index++) {
    loading.innerHTML += `<span style="--i:${index};"></span>`
}



function showRanking() {
    sendMessage("getRank", 0)
    actualWindow([1, 9])
}

function closeRank() {
    actualWindow([1])
}

function offerRequest(enemyId) {
    sendMessage('offerRequest', enemyId)
}

function acceptRequest(id) {
    sendMessage('acceptRequest', id)
}

function refuseRequest(dataId, requestId) {
    sendMessage('refuseRequest', dataId)
    const actualRequest = document.getElementById(requestId)
    actualRequest.remove()
}

function actualWindow(showWindows) {
    windows.forEach((window, index) => {
        window.style.display = showWindows.includes(index) ? "flex" : "none";
    });
}

function reMatch() {
    if (rematchBtn.innerHTML == "Offer Rematch") {
        sendMessage("reMatch", 0)
    } else if (rematchBtn.innerHTML == "Accept Rematch") {
        sendMessage("reMatchAccepted", 0)
    }
}

function newOponent() {
    sendMessage("newOponent", 0)

    resetGame()
    actualWindow([1, 6])
}

function startGame() {
    finish = false
    createTimeManager()
    counterContent.style.display = "flex";
    let count = 5
    const intervalCount = setInterval(function () {
        counter.innerHTML = count
        if (count == 0) {
            writing = true
            clearInterval(intervalCount)
            counterContent.style.display = "none";

            if (computer) {
                let timer = 0
                let missFlag = false
                computerSpeed = (0.1 * selectedDiff).toFixed(2)

                const computerInter = setInterval(() => {
                    timer += 0.01;

                    if (timer >= computerSpeed) {
                        if (missFlag) {
                            let lettersLen = enemyText.innerHTML.length;
                            enemyText.innerHTML = enemyText.innerHTML.slice(0, lettersLen - 14)
                            missFlag = false
                            computerActualLetter -= 2
                        } else {
                            let miss = getRandomInt(1, 10)
                            if (miss <= computerMissChance) {
                                enemyText.innerHTML += `<span>a</span>`
                                missFlag = true
                            } else {
                                enemyText.innerHTML += actualText[computerActualLetter]
                            }
                        }
                        computerActualLetter++
                        timer = 0
                    }

                    if (computerActualLetter >= actualText.length) {
                        clearInterval(computerInter)
                        if (resultsContent.style.display == "none") {
                            lost = true
                            displayFinishScreen()
                        }
                    }

                }, 10);
            }

        }
        count--;
    }, 1000);
    changeText(selectedLanguage);
}

function resetGame() {
    computer = false
    computerActualLetter = 0
    rematchBtn.disabled = false
    rematchBtn.style.filter = "brightness(1)"
    rematchBtn.innerHTML = "Offer Rematch"
    resultsContent.style.display = "none"
    correctLetters = 0
    actualLetter = 0
    numMistakes = 0
    lost = false
    writing = false
    actualTime = 0
    letterState = []
    timeLabel.innerHTML = "0"
    enemyText.innerHTML = ""
    textAbove.innerHTML = ""
    clearInterval(timeManager)
}

function changeText(selectedLanguage) {
    text.innerHTML = texts[selectedLanguage][textCount]
    actualText = texts[selectedLanguage][textCount]
    actualTextLen = actualText.length
}

function processJSON(jsonData) {
    try {
        var data = JSON.parse(jsonData);
        texts = data.texts;

        var languages = Object.keys(texts);

        var count = 1
        languages.forEach(language => {
            languagesContent.innerHTML += `<option value="${language}">${capitalize(language)}</option>`
            count++;
        });


    } catch (error) {
        console.error('Erro ao processar JSON:', error);
    }
}

function loadJSON(callback) {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType("application/json");
    xhr.open('GET', 'assets/texts.json', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            callback(xhr.responseText);
        }
    };
    xhr.send(null);
}

function capitalize(word) {
    if (typeof word !== 'string' || word.length === 0) {
        return '';
    }

    return word.charAt(0).toUpperCase() + word.slice(1);
}

languagesContent.addEventListener('change', () => {
    selectedLanguage = languagesContent.value;
    changeText(selectedLanguage);
})

diffChoose.addEventListener('change', () => {
    selectedDiff = diffChoose.value;
})

function playComputer() {
    if (diffChoose.value !== "") {
        actualWindow([5])
        resetGame()
        computer = true
        startGame()
    }
}

function createTimeManager() {

    timeManager = setInterval(function () {
        if (correctLetters == actualTextLen) {
            displayFinishScreen();
            clearInterval(timeManager)
        }

        if (!finish) {
            if (writing) {
                actualTime++
            } else {
                actualTime = 0
            }
            timeLabel.innerHTML = actualTime
        }

    }, 1000);

}

function againComputer() {
    playComputer()
}

function goBackF() {
    resetGame()
    actualWindow([1])
}

function displayFinishScreen() {

    if (computer) {
        rematchBtn.style.display = "none"
        newOpo.style.display = "none"
        playAgain.style.display = "flex"
        goBack.style.display = "flex"
    } else {
        rematchBtn.style.display = "flex"
        newOpo.style.display = "flex"
        playAgain.style.display = "none"
        goBack.style.display = "none"
    }

    if (!lost) {
        sendMessage('win', 0)
        resultImg.src = "assets/imgs/award.png"
        resultText.innerHTML = "Congratulations you are the winner !"
    } else {
        resultImg.src = "assets/imgs/sad.png"
        resultText.innerHTML = "Good luck next time"
    }

    actualWindow([3]);

    finish = true
    miss.innerHTML = numMistakes
    timeResultsLabel.innerHTML = actualTime
    var mediaLT = (correctLetters / actualTime).toFixed(2).replace(',', '.')
    media.innerHTML = mediaLT
    if (numMistakes != 0) {
        precision.innerHTML = `${(100 - ((numMistakes / actualTextLen) * 100)).toFixed(1)}%`
    } else if (numMistakes == 0 && correctLetters != actualTextLen) {
        precision.innerHTML = `0%`
    } else {
        precision.innerHTML = `100%`
    }

    let info = [userName, mediaLT]

    if (!lost) {
        sendMessage('updateTimeList', info)
    }

}

document.addEventListener('keydown', (event) => {
    numMis.innerHTML = numMistakes

    if (writing) {
        if (event.key === 'Backspace') {
            if (actualLetter > 0) {
                if (letterState[actualLetter - 1]) {
                    let lettersLen = textAbove.innerHTML.length;
                    textAbove.innerHTML = textAbove.innerHTML.slice(0, lettersLen - 14);
                } else {
                    textAbove.innerHTML = textAbove.innerHTML.slice(0, -1);
                    correctLetters--
                }
                translateValue+=1.5;
                actualLetter--;
            }
        }

        const isLetter = event.key.length === 1;

        if (isLetter) {
            if (event.key != actualText[actualLetter]) {
                textAbove.innerHTML += `<span>${event.key}</span>`;
                numMistakes++
                letterState[actualLetter] = true
            } else {
                textAbove.innerHTML += event.key;
                letterState[actualLetter] = false
                correctLetters++
            }
            actualLetter++;
            translateValue-=1.5;
        }
        textAbove.style.transform = `translate(${translateValue}%, 0%)`;
        text.style.transform = `translate(${translateValue}%, 0%)`;
        enemyText.style.transform = `translate(${translateValue}%, 1%)`;
        sendMessage('updateText', textAbove.innerHTML)
    }


});

function sendMessage(type, content) {
    const message = {
        type: type,
        content: content
    };
    webSocket.send(JSON.stringify(message));
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}




loadJSON(processJSON);
changeText(selectedLanguage);
