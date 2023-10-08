// funções desenvolvidas por chrokh
// https://github.com/chrokh/fp-games/blob/master/001-snake/base.js
const merge     = o1 => o2 => Object.assign({}, o1, o2)
const objOf     = k => v => ({ [k]: v })
const spec      = o => x => Object.keys(o).map(k => objOf(k)(o[k](x))).reduce((acc, o) => Object.assign(acc, o))
const specEvent = o => e => x => Object.keys(o).map(k => objOf(k)(o[k](e)(x))).reduce((acc, o) => Object.assign(acc, o))

//objeto mutável, fonte das imagens do game
const sprite = new Image()
sprite.src = "./sprites.png"
//


// Desenha um objeto do jogo, utilizando de um contexto do canvas uma imagem de spritesheet e o próprio objeto
// São utilizadas as coodenadas do objeto, e do recorte do sprite que contem a imagem dele, além das dimensões do objeto e do recorte do sprite
const draw_game_object = (context) => (image) => (obj) => {
    context.drawImage(image, obj.spriteX, obj.spriteY, obj.swidth, obj.sheight, obj.x, obj.y, obj.width, obj.height)
}

//Limita uma posição a se manter dentro de um intervalo, para que quando passe das bordas se mantenha nas bordas
const cap = (up_cap, down_cap) => (pos) => {
    if (pos > up_cap) {
        return up_cap
    }
    if (pos < down_cap) {
        return down_cap
    }
    return pos
}

//mapeia um valor de zero a um para um valor dentro do intervalo especificado(utilizado para trabalhar com numeros aleatorios)
const map = (up, down) => (value) => value*(up - down) + down

// Verifica se ocorreu uma colisão entre o jogador e um objeto
function check_collision(player, object) {
  return (
    player.x + player.width >= object.x &&
    player.x <= object.x + object.width &&
    player.y + player.height >= object.y &&
    player.y <= object.y + object.height
  )
}
//cria um cano
const pipe = (x, y, inverted) => {
    return {
        spriteX: inverted ? 52 : 0,
        spriteY: 169,
        swidth: 52,
        sheight: 400,
        width: 52,
        height: 400,
        x: x,
        y: y
    }
}

//cria uma moeda
const coin = (x, y) => {
  return {
    spriteX: 0,
    spriteY: 77 ,
    swidth: 44,
    sheight: 45,
    width:  40,
    height: 40,
    x: x,
    y: y
  }
}

//cria um par de canos(um normal e um de cabeça para baixo)
const pipe_pair = (x, y, gap) => {
    return {
        floor_pipe: pipe(x, y, false),
        sky_pipe: pipe(x, y - gap - 400, true)
    }
}

// gera um novo objeto de jogador(player) atualizando sua posição com base na cena do jogo, no tempo passado, e na tecla pressionada
const next_player = (name) => (execution) => (state) => {
  if(state.scene === "play") {
    const new_y = cap(state.canvas.height - state.floor.height, 0)(state[name].y +state[name].v*execution.dt)
    const new_v = (execution.keyboard[state[name].key]) ? -0.5 : state[name].v + execution.dt*0.002
    const other_name = name === "player" ? "player2" : "player"
    const added_coin = state.money.coins.some((x) => check_collision(state[name], x)) ? 1: 0
    const new_coins = state[name].coins + added_coin
    const size_factor = cap(2, 1)((state[other_name].coins - state[name].coins)*0.25 + 1)
    const new_height = state[name].sheight*size_factor
    //console.log(size_factor)
    const new_width = state[name].swidth*size_factor
    return merge(state[name])({y: new_y, v: new_v, coins: new_coins, width: new_width, height: new_height})
  }
  return merge(state[name])({y: 50, v: 0, width: state[name].swidth, height: state[name].sheight, coins: 0})
}

//Muda a cena do jogo, sai da tela de início se apertar "w", volta pra tela de inicio se morrer
const next_scene = (execution) => (state) => {
  if (state.scene === "start") {
    if (execution.keyboard.w || execution.keyboard.p) {
      return "play"
    }
    return "start"
  }
  else if (state.scene === "play") {
    // verifica a colisão dos players com o cano
    //player 1
    const collided_with_pipe_player1 = state.pipes.pairs.some((pipe) =>
      check_collision(state.player, pipe.floor_pipe) || check_collision(state.player, pipe.sky_pipe)
    )
   // player2
    const collided_with_pipe_player2 = state.pipes.pairs.some((pipe) =>
      check_collision(state.player2, pipe.floor_pipe) || check_collision(state.player2, pipe.sky_pipe)
    )

    // verifica colisão dos players com o chão
    //player 1
    const collided_with_floor_player1 = state.player.y + state.player.height >= state.floor.y
    //player 2
    const collided_with_floor_player2 = state.player2.y + state.player2.height >= state.floor.y

    if ((collided_with_pipe_player1 || collided_with_floor_player1) && (collided_with_pipe_player2 || collided_with_floor_player2)) {
      // player um e player dois colidiram com o cano Ou com o chão, joga para tela final de empate
      return "tie"
    }
    if ((collided_with_pipe_player1 || collided_with_floor_player1) && !(collided_with_pipe_player2 || collided_with_floor_player2)) {
      // somente player um colidiu com o cano ou com o chão, joga para tela final de vitória do player dois
      return "winner 2"
    }
    if ((collided_with_pipe_player2 || collided_with_floor_player2) && !(collided_with_pipe_player1 || collided_with_floor_player1)) {
      // somente player dois colidiu com o cano ou com o chão, joga para tela final de vitória do player um
      return "winner 1"
    }
    return "play"
  }
  else if(state.scene === "winner 1" || state.scene === "winner 2" || state.scene === "tie") {
    if (execution.keyboard.space) {
      return "start"
    }
    return state.scene
  }
  return "play"
}

//função que retorna uma propriedade do jogo igual à que foi passada como parâmetro, utilizada na função next_state para os elementos do game que não serão alterados com o tempo
const keep = (name) => (execution) => (state) => state[name]

//Move um objeto do cenário do jogo(utilizado para mover o plano de fundo e o chão)
const move_scenario_object = (name) => (execution) => (state) => {
    if(state[name].x <= -state[name].width) {
        return merge(state[name])({x: 0})
    }
    return merge(state[name])({x: state[name].x - state.speed*execution.dt})
}

//Move um cano
const move_object = (speed) => (dt) => (selected_object) => {
    return merge(selected_object)({x: selected_object.x - speed*dt})
}

//atualiza todos os canos da tela(mudando suas posições)
const update_pipes = (execution) => (state) => {
    if(state.scene === "play")
    {
        const new_gap = map(120, 160)(execution.seed)
        const new_pos = map(52 + new_gap, state.floor.y - 52)(execution.seed)
        const updated_clock = state.pipes.clock + execution.dt
        const added_pairs = updated_clock > 1500 ? [...state.pipes.pairs, pipe_pair(state.canvas.width, new_pos, new_gap)] : [...state.pipes.pairs]
        const moved_pairs = added_pairs.map((x) => merge(x)({floor_pipe: move_object(state.speed)(execution.dt)(x.floor_pipe), sky_pipe: move_object(state.speed)(execution.dt)(x.sky_pipe)}))
        //const on_screen_pairs = moved_pairs.filter((x) => x.floor_pipe.x + 52 < 0)
        const new_clock = updated_clock > 1500 ? 0 : updated_clock
        return {pairs: [...moved_pairs], clock: new_clock}
    }
    return {pairs: [], clock: 0}
}
//atualiza as moedas
const update_money = (execution) => (state) => {
  if(state.scene === "play") {
    const new_posY = map(0, state.canvas.height - state.floor.height - 50)(1 - execution.seed)
    const new_posX = map(state.canvas.width + 62,state.canvas.width + 52 + 1500*state.speed - 104)(execution.seed)
    const updated_clock = state.money.clock + execution.dt
    const added_coins = updated_clock > 1500 ? [...state.money.coins, coin(new_posX, new_posY)] : [...state.money.coins]
    const intact_coins = added_coins.filter((x) => !check_collision(state.player, x) && !check_collision(state.player2, x))
    const moved_coins = intact_coins.map((x) => move_object(state.speed)(execution.dt)(x))
    const new_clock = updated_clock > 1500 ? 0 : updated_clock
    return {coins: [...moved_coins], clock: new_clock}
  }
  return {coins: [], clock: 0}
}
//gera um novo estado do jogo
const next_state = specEvent({
    canvas: keep("canvas"),
    context: keep("context"),
    spritesheet: keep("spritesheet"),
    initial_screen: keep("initial_screen"),
    tie_screen: keep("tie_screen"),
    winning_screen: keep("winning_screen"),
    speed: keep("speed"),
    pipes: update_pipes,
    floor: move_scenario_object('floor'),
    background: move_scenario_object('background'),
    player: next_player("player"),
    player2: next_player("player2"),
    money: update_money,
    press_w: keep("press_w"),
    press_space: keep("press_space"),
    scene: next_scene
})

//desenha o jogo com base em seus objetos e sua cena
const draw_game = (state) => {
    draw_game_object(state.context)(state.spritesheet)(state.background)
    draw_game_object(state.context)(state.spritesheet)(state.floor)
    draw_game_object(state.context)(state.spritesheet)(merge(state.background)({x: state.background.x + state.background.width}))
    draw_game_object(state.context)(state.spritesheet)(merge(state.floor)({x: state.floor.x + state.floor.width}))
    if(state.scene === "play"){
      draw_game_object(state.context)(state.spritesheet)(state.player)
      draw_game_object(state.context)(state.spritesheet)(state.player2)
      state.pipes.pairs.map((x) => {
        draw_game_object(state.context)(state.spritesheet)(x.floor_pipe)
        draw_game_object(state.context)(state.spritesheet)(x.sky_pipe)
      })
      state.money.coins.map((x) => {
        draw_game_object(state.context)(state.spritesheet)(x)
      })
    }
    else if(state.scene === "start") {
        draw_game_object(state.context)(state.spritesheet)(state.initial_screen)
        draw_game_object(state.context)(state.spritesheet)(state.press_w)
    }
    else if(state.scene === "tie") {
      draw_game_object(state.context)(state.spritesheet)(state.tie_screen)
      draw_game_object(state.context)(state.spritesheet)(state.press_space)
    }
    else if(state.scene === "winner 1") {
      draw_game_object(state.context)(state.spritesheet)(state.winning_screen)
      draw_game_object(state.context)(state.spritesheet)(merge(state.player)({y: state.winning_screen.y + state.winning_screen.height/2.25, x: state.winning_screen.x + state.winning_screen.width/8, width: state.player.swidth, height: state.player.sheight}))
      draw_game_object(state.context)(state.spritesheet)(state.press_space)
    }
    else if(state.scene === "winner 2") {
      draw_game_object(state.context)(state.spritesheet)(state.winning_screen)
      draw_game_object(state.context)(state.spritesheet)(merge(state.player2)({y: state.winning_screen.y + state.winning_screen.height/2.25, x: state.winning_screen.x + state.winning_screen.width/8, width: state.player2.swidth, height: state.player2.sheight}))
      draw_game_object(state.context)(state.spritesheet)(state.press_space)
    }
}

// trecho não funcional

//estado do jogo
let game = {
  canvas : Object.freeze(document.getElementById('canvas')),
  context : Object.freeze(canvas.getContext('2d')),
  spritesheet: Object.freeze(sprite),
  speed: 0.25,
  scene: "start",
  floor: {
    spriteX: 0,
    spriteY: 610,
    swidth: 224,
    sheight: 112,
    width: canvas.width,
    height: (112/480)*canvas.width,
    x: 0,
    y: canvas.height - (112/480)*canvas.width,
  },
  player2: {
    spriteX: 38,
    spriteY: 0,
    swidth: 33,
    sheight: 24,
    width: 33,
    height: 24,
    x: canvas.width / 2 - 16.5,
    y: 50,
    v: 0,
    key: "p",
    coins: 0
  },
  player: {
    spriteX: 0,
    spriteY: 0,
    swidth: 33,
    sheight: 24,
    width: 33,
    height: 24,
    x: canvas.width / 2 - 16.5,
    y: 50,
    v: 0,
    key: "w",
    coins: 0
  },
  background : {
    spriteX: 390,
    spriteY: 0,
    swidth: 275,
    sheight: 204,
    width: canvas.width,
    height: canvas.height + 50,
    x: 0,
    y: -50,
    coins: 0
  },
  initial_screen:  {
    spriteX: 134,
    spriteY: 0,
    swidth: 174,
    sheight: 152,
    width: 174,
    height: 152,
    x: (canvas.width / 2) - 174 / 2,
    y: 50
  },
  tie_screen:  {
    spriteX: 134,
    spriteY: 155,
    swidth: 224,
    sheight: 40,
    width: 224,
    height: 40,
    x: (canvas.width / 2) - 224 / 2,
    y: 50
  },
  winning_screen:  {
    spriteX: 135,
    spriteY: 155,
    swidth: 240,
    sheight: 200,
    width: 224,
    height: 152,
    x: (canvas.width / 2) - 224 / 2,
    y: 50
  },
  press_w: {
    spriteX: 248,
    spriteY: 590,
    swidth: 300,
    sheight: 300,
    width: 390,
    height: 250,
    x: (canvas.width / 2) - 350 / 2,
    y: 380
  },
  press_space: {
    spriteX: 500,
    spriteY: 600,
    swidth: 260,
    sheight: 300,
    width: 250,
    height: 200,
    x: (canvas.width / 2) - 210 / 2,
    y: 400
  },
  pipes: {pairs: [], clock: 0},
  money: {coins: [], clock: 0}
    
}


//variável que armazena quando a tecla "w" é apertada e a variação de tempo entre um frame e outro
let global_event = {w: false, p: false, space: false}

//atualiza os frames e o estado do jogo
const loop = (t1) => (t2) => {
  // atualiza o jogo
  game = next_state({dt: t2 - t1, seed: Math.random(), keyboard: global_event})(game);
  // renderiza o jogo na tela
  draw_game(game);
  //chama a função de novo
  window.requestAnimationFrame(loop(t2));
};

//atualiza a variável global quando as teclas "w", "p" e " " é apertada e solta
window.addEventListener("keypress", (e) => {
  if (e.key === "w" && global_event.w === false) {
    global_event.w = true
  }
  if (e.key === "p" && global_event.p === false) {
    global_event.p = true
  }
  if (e.key === " " && global_event.space === false) {
    global_event.space = true
  }
})
window.addEventListener("keyup", (e) => {
  if (e.key === "w") {
    global_event.w = false
  }
  if (e.key === "p") {
    global_event.p = false
  }
  if (e.key === " ") {
    global_event.space = false
  }
})
//roda o jogo
loop(0)(0)