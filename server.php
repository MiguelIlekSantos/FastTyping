<?php

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

require __DIR__ . '/vendor/autoload.php';

class Player
{
    public $id;
    public $active;
    public $name;
    public $language;
    public $connection;

    public function __construct($id, $active, $name, $language, $connection)
    {
        $this->id = $id;
        $this->active = $active;
        $this->name = $name;
        $this->language = $language;
        $this->connection = $connection;
    }
}

class Chat implements MessageComponentInterface
{
    public $clients;
    public $players = [];
    public $doubles = [];

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "Nova conexão! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);

        switch ($data['type']) {
            case 'register':
                include("includes/DBconfig.php");

                $name = $data['content'][1];
                $userPassword = $data['content'][2];

                if ($data['content'][0] === "login") {
                    $sql = "SELECT * FROM userslogin WHERE username = ?";
                    $stmt = mysqli_prepare($conn, $sql);
                    mysqli_stmt_bind_param($stmt, "s", $name);
                    mysqli_stmt_execute($stmt);
                    $result = mysqli_stmt_get_result($stmt);

                    if ($user = mysqli_fetch_assoc($result)) {
                        if (password_verify($userPassword, $user['password'])) {
                            $language = $data['content'][3];
                            $player = new Player($from->resourceId, false, $name, $language, $from);
                            $this->players[$from->resourceId] = $player;
                            $from->send(json_encode(['type' => 'login']));
                            $this->updateEnemyList();
                        } else {
                            $from->send(json_encode(['type' => 'loginFailed']));
                        }
                    } else {
                        $from->send(json_encode(['type' => 'loginFailed']));
                    }
                } else if ($data['content'][0] === "signup") {
                    $sql = "SELECT * FROM userslogin WHERE username = ?";
                    $stmt = mysqli_prepare($conn, $sql);
                    mysqli_stmt_bind_param($stmt, "s", $name);
                    mysqli_stmt_execute($stmt);
                    $result = mysqli_stmt_get_result($stmt);

                    if (mysqli_num_rows($result) >= 1) {
                        $from->send(json_encode(['type' => 'changeName']));
                    } else {
                        $hashedPassword = password_hash($userPassword, PASSWORD_BCRYPT);
                        $sql = "INSERT INTO userslogin (username, password) VALUES (?, ?)";
                        $stmt = mysqli_prepare($conn, $sql);
                        mysqli_stmt_bind_param($stmt, "ss", $name, $hashedPassword);
                        mysqli_stmt_execute($stmt);

                        $sql = "INSERT INTO highestmedia (username, media) VALUES (?, ?)";
                        $stmt = mysqli_prepare($conn, $sql);
                        $zerovalue = 0;
                        mysqli_stmt_bind_param($stmt, "si", $name, $zerovalue);
                        mysqli_stmt_execute($stmt);

                        $from->send(json_encode(['type' => 'signedUp']));
                    }
                }

                mysqli_close($conn);
                break;
            case 'updateTimeList':
                include("includes/DBconfig.php");

                $newName = $data['content'][0];
                $newMedia = $data['content'][1];

                echo "Name : $newName \n";
                echo "Media : $newMedia \n";

                $sql = "SELECT media FROM highestmedia WHERE username = ?";
                $stmt = mysqli_prepare($conn, $sql);
                mysqli_stmt_bind_param($stmt, "s", $newName);
                mysqli_stmt_execute($stmt);
                $result = mysqli_stmt_get_result($stmt);

                if ($row = mysqli_fetch_assoc($result)) {
                    $currentMedia = $row['media'];

                    if ($newMedia > $currentMedia) {
                        $sql = "UPDATE highestmedia SET media = ? WHERE username = ?";
                        $stmt = mysqli_prepare($conn, $sql);
                        mysqli_stmt_bind_param($stmt, "ss", $newMedia, $newName);
                        mysqli_stmt_execute($stmt);
                    }
                }

                mysqli_close($conn);
                break;
            case 'getRank':
                include("includes/DBconfig.php");

                $sql = "SELECT username, media FROM highestmedia ORDER BY media DESC";
                $stmt = mysqli_prepare($conn, $sql);
                mysqli_stmt_execute($stmt);
                $result = mysqli_stmt_get_result($stmt);

                $rankList = [];

                while ($row = mysqli_fetch_assoc($result)) {
                    $rankList[] = $row;
                }

                $from->send(json_encode(['type' => 'rankList', 'content' => $rankList]));

                mysqli_close($conn);
                break;

            case 'offerRequest':
                $actualId = $from->resourceId;
                $enemyId = $data['content'];

                $requestingPlayer = $this->players[$actualId];
                $requestedPlayer = $this->players[$enemyId];

                if ($requestingPlayer && !$requestingPlayer->active && $requestedPlayer && !$requestedPlayer->active) {

                    $requestedPlayer->connection->send(json_encode([
                        'type' => 'request',
                        'content' => [
                            'id' => $requestingPlayer->id,
                            'name' => $requestingPlayer->name,
                            'language' => $requestingPlayer->language
                        ]
                    ]));
                }

                break;
            case 'acceptRequest':
                $actualId = $from->resourceId;
                $enemyId = $data['content'];

                $Player1 = $this->players[$actualId];
                $Player2 = $this->players[$enemyId];

                $double = [
                    "Player1" => $Player1,
                    "Player2" => $Player2
                ];

                array_push($this->doubles, $double);
                $Player1->active = true;
                $Player2->active = true;

                $value = rand(0, 4);

                $Player1->connection->send(json_encode([
                    'type' => 'textCount',
                    'content' => $value
                ]));
                $Player2->connection->send(json_encode([
                    'type' => 'textCount',
                    'content' => $value
                ]));

                $Player1->connection->send(json_encode(['type' => 'gameStart']));
                $Player2->connection->send(json_encode(['type' => 'gameStart']));
                $this->updateEnemyList();
                break;
            case 'refuseRequest':
                $enemyId = $data['content'];
                $Player = $this->players[$enemyId];
                $Player->connection->send(json_encode(['type' => 'refused']));
                break;
            case 'updateText':
                $text = $data['content'];

                for ($i = 0; $i < count($this->doubles); $i++) {
                    if ($this->doubles[$i]['Player1']->id === $from->resourceId || $this->doubles[$i]['Player2']->id === $from->resourceId) {
                        if ($this->doubles[$i]['Player1']->id === $from->resourceId) {
                            $this->doubles[$i]['Player2']->connection->send(json_encode([
                                'type' => 'updateEnemyText',
                                'content' => $text
                            ]));
                        } else if ($this->doubles[$i]['Player2']->id === $from->resourceId) {
                            $this->doubles[$i]['Player1']->connection->send(json_encode([
                                'type' => 'updateEnemyText',
                                'content' => $text
                            ]));
                        }
                        break;
                    }
                }

                break;
            case 'reMatch':
                for ($i = 0; $i < count($this->doubles); $i++) {
                    if ($this->doubles[$i]['Player1']->id === $from->resourceId || $this->doubles[$i]['Player2']->id === $from->resourceId) {
                        if ($this->doubles[$i]['Player1']->id === $from->resourceId) {
                            $this->doubles[$i]['Player2']->connection->send(json_encode(['type' => 'reMatchOffer']));
                        } else if ($this->doubles[$i]['Player2']->id === $from->resourceId) {
                            $this->doubles[$i]['Player1']->connection->send(json_encode(['type' => 'reMatchOffer']));
                        }
                        break;
                    }
                }

                break;
            case 'reMatchAccepted':
                for ($i = 0; $i < count($this->doubles); $i++) {
                    if ($this->doubles[$i]['Player1']->id === $from->resourceId || $this->doubles[$i]['Player2']->id === $from->resourceId) {
                        $this->doubles[$i]['Player1']->connection->send(json_encode(['type' => 'gameStart']));
                        $this->doubles[$i]['Player2']->connection->send(json_encode(['type' => 'gameStart']));
                        break;
                    }
                }

                break;
            case 'win':
                for ($i = 0; $i < count($this->doubles); $i++) {
                    if ($this->doubles[$i]['Player1']->id === $from->resourceId || $this->doubles[$i]['Player2']->id === $from->resourceId) {
                        if ($this->doubles[$i]['Player1']->id === $from->resourceId) {
                            $this->doubles[$i]['Player2']->connection->send(json_encode(['type' => 'lose']));
                        } else if ($this->doubles[$i]['Player2']->id === $from->resourceId) {
                            $this->doubles[$i]['Player1']->connection->send(json_encode(['type' => 'lose']));
                        }
                        break;
                    }
                }
                $this->updateEnemyList();
                break;
            case 'newOponent':
                $foundDoubleIndex = -1;

                for ($i = 0; $i < count($this->doubles); $i++) {
                    if ($this->doubles[$i]['Player1']->id === $from->resourceId || $this->doubles[$i]['Player2']->id === $from->resourceId) {
                        $foundDoubleIndex = $i;
                        break;
                    }
                }

                if ($foundDoubleIndex !== -1) {
                    $remainingDouble = $this->doubles[$foundDoubleIndex];

                    $remainingDouble['Player1']->active = false;
                    $remainingDouble['Player2']->active = false;

                    if ($remainingDouble['Player1']->id !== $from->resourceId) {
                        $remainingDouble['Player2']->connection->send(json_encode(['type' => 'notRematch']));
                    } else if ($remainingDouble['Player2']->id !== $from->resourceId) {
                        $remainingDouble['Player1']->connection->send(json_encode(['type' => 'notRematch']));
                    }

                    unset($this->doubles[$foundDoubleIndex]);
                }
                $this->updateEnemyList();
                break;
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        unset($this->players[$conn->resourceId]);
        $foundDoubleIndex = -1;

        for ($i = 0; $i < count($this->doubles); $i++) {
            if ($this->doubles[$i]['Player1']->id === $conn->resourceId || $this->doubles[$i]['Player2']->id === $conn->resourceId) {
                $foundDoubleIndex = $i;
                break;
            }
        }

        if ($foundDoubleIndex !== -1) {
            $remainingDouble = $this->doubles[$foundDoubleIndex];

            if ($this->players[$remainingDouble['Player1']->id]) {
                unset($this->players[$remainingDouble['Player1']->id]);
            } else if ($this->players[$remainingDouble['Player2']->id]) {
                unset($this->players[$remainingDouble['Player2']->id]);
            }

            if ($remainingDouble['Player1']->id !== $conn->resourceId) {
                array_push($this->players, $remainingDouble['Player1']);
                $remainingDouble['Player1']->connection->send(json_encode(['type' => 'left']));
            } else if ($remainingDouble['Player2']->id !== $conn->resourceId) {
                array_push($this->players, $remainingDouble['Player2']);
                $remainingDouble['Player2']->connection->send(json_encode(['type' => 'left']));
            }

            unset($this->doubles[$foundDoubleIndex]);
        }

        $this->updateEnemyList();

        $this->clients->detach($conn);
        echo "Conexão {$conn->resourceId} foi desconectada\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Ocorreu um erro: {$e->getMessage()}\n";
        $conn->close();
    }

    public function updateEnemyList()
    {
        foreach ($this->players as $player) {
            $data = array_filter($this->players, function ($p) use ($player) {
                return $p->id !== $player->id;
            });

            $player->connection->send(json_encode(['type' => 'enemyList', 'content' => array_values($data)]));
        }
    }
}

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new Chat()
        )
    ),
    80
);

$server->run();
