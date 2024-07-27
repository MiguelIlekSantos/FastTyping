
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
const inputWindow = document.getElementById("input-content");
const loadingWindow = document.getElementById("loading-content");
const counterContent = document.getElementById("counter-content");
const input = document.getElementById('nameInput');
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

//              0 - input      1 - enemy       2 - loading     3 - results     4 - counter    5 - main   6 - requests  7 - computer

var windows = [inputWindow, chooseEnemyWindow, loadingWindow, resultsContent, counterContent, gameWindow, requests, computerContent]


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




// -----------------LOGIN PAGE-----------------------





function sendName() {
    computer = false
    if (input.value !== "" && languagesContent.value !== "") {
        socket.emit('register', input.value, selectedLanguage);
    }
}
function againstComputer() {
    actualWindow([7])
}



// ------------------SERVER-CLIENT-------------------



var socket = io();

socket.on('login', function () {
    actualWindow([1, 6]);
});

socket.on('textCount', function (value) {
    textCount = value
});

socket.on('enemyList', function (data) {
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
});

socket.on('request', function (data) {
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
});

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

socket.on('refused', function () {
    console.log("He doesnt wanna play")
});

socket.on('left', function () {
    resetGame();
    actualWindow([1, 6]);
    alert("Your opponent has been disconnected :(")
});
socket.on('gameStart', function () {
    actualWindow([4, 5]);
    resetGame();
    startGame();
});
socket.on('updateEnemyText', function (text) {
    enemyText.innerHTML = text
});
socket.on('reMatchOffer', function () {
    rematchBtn.innerHTML = "Accept Rematch"
});
socket.on('lose', function () {
    console.log("You lose")
    displayFinishScreen();
    lost = true
});
socket.on('notRematch', function () {
    resetGame()
    actualWindow([1, 6]);
});





// ----------------MANAGE PAGE-------------------






for (let index = 1; index <= 20; index++) {
    loading.innerHTML += `<span style="--i:${index};"></span>`
}



function offerRequest(enemyId) {
    socket.emit('offerRequest', enemyId);
}

function acceptRequest(id) {
    socket.emit('acceptRequest', id);
}

function refuseRequest(dataId, requestId) {
    socket.emit('refuseRequest', dataId);
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
        socket.emit('reMatch');
    } else if (rematchBtn.innerHTML == "Accept Rematch") {
        socket.emit('reMatchAccepted');
    }
}

function newOponent() {
    socket.emit('newOponent');
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
                            console.log("MissFlag : true")
                            let lettersLen = enemyText.innerHTML.length;
                            console.log("LettersLen : ", lettersLen)
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
                        console.log(enemyText.innerHTML)
                        computerActualLetter++
                        timer = 0
                    }

                    if (computerActualLetter >= actualText.length) {
                        clearInterval(computerInter)
                        console.log("AAAAAAAAA")
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
    actualWindow([0])
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
        socket.emit('win');
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
    media.innerHTML = (correctLetters / actualTime).toFixed(2)
    if (numMistakes != 0) {
        precision.innerHTML = `${(100 - ((numMistakes / actualTextLen) * 100)).toFixed(1)}%`
    } else if (numMistakes == 0 && correctLetters != actualTextLen) {
        precision.innerHTML = `0%`
    } else {
        precision.innerHTML = `100%`
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
        }
    }

    socket.emit("updateText", textAbove.innerHTML)

});

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}




loadJSON(processJSON);
changeText(selectedLanguage);

