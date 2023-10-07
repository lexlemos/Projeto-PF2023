// funções desenvolvidas por chrokh
// https://github.com/chrokh/fp-games/blob/master/001-snake/base.js
const merge     = o1 => o2 => Object.assign({}, o1, o2)
const objOf     = k => v => ({ [k]: v })
const spec      = o => x => Object.keys(o).map(k => objOf(k)(o[k](x))).reduce((acc, o) => Object.assign(acc, o))
const specEvent = o => e => x => Object.keys(o).map(k => objOf(k)(o[k](e)(x))).reduce((acc, o) => Object.assign(acc, o))

//objeto mutavel
const sprite = new Image()
sprite.src = "./sprites.png"
const sprite2 = new Image()
sprite2.src = "./sprites2.png"
//
// Verifica se ocorreu uma colisão entre o jogador e um objeto
function check_collision(player, object) {
  return (
    player.x + player.width > object.x &&
    player.x < object.x + object.width &&
    player.y + player.height > object.y &&
    player.y < object.y + object.height
  );
}

// Desenha um objeto do jogo, utilizando de um contxto do canvas uma imagem de spritesheet e o próprio objeto
// São utilizadas as coodenadas do objeto, e do recorte do sprite que contem a imagem dele, além das dimensões do objeto e do recorte do sprite
const draw_game_object = (context) => (image) => (obj) => {
    context.drawImage(image, obj.spriteX, obj.spriteY, obj.swidth, obj.sheight, obj.x, obj.y, obj.width, obj.height)
}

//Limita uma posição a se manter dentro de um intervalo, para que quando passe das bordas se mantenha nas bordas
const cap = (up_cap, down_cap) => (pos, height) => {
    if (pos + height > up_cap) {
        return up_cap - height
    }
    if (pos < down_cap) {
        return down_cap
    }
    return pos
}

//mapeia um valor de zero a um para um valor dentro do intervalo especificado(utilizado para trabalhar com numeros aleatorios)
const map = (up, down) => (value) => value*(up - down) + down

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
    const new_y =   cap(state.canvas.height - state.floor.height, 0)(state[name].y +state[name].v*execution.dt, 24)
    const new_v = (execution.keyboard[state[name].key]) ? -0.5 : state[name].v + execution.dt*0.002
    return merge(state[name])({y: new_y, v: new_v})
  }
  return merge(state[name])({x: state.canvas.width / 2 - 16.5, y: 50, v: 0})
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
    // verifica a colisão do player um com o cano
    const collided_with_pipe_player1 = state.pipes.pairs.some((pipe) =>
      check_collision(state.player, pipe.floor_pipe) || check_collision(state.player, pipe.sky_pipe)
    )

    // mesma coisa, porém player 2
    const collided_with_pipe_player2 = state.pipes.pairs.some((pipe) =>
      check_collision(state.player2, pipe.floor_pipe) || check_collision(state.player2, pipe.sky_pipe)
    )

    // verifica colisão dos players com o chão com o chão
    //player 1
    const collided_with_floor_player = state.player.y + state.player.height >= state.floor.y
    //player 2
    const collided_with_floor_player2 = state.player2.y + state.player2.height >= state.floor.y

    if (collided_with_pipe_player1 || collided_with_pipe_player2 || collided_with_floor_player || collided_with_floor_player2) {
      // player um OU o player dois colidiu com o cano Ou com o chão, joga para tela inicial
      return "start"
    }
    return "play"
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
const move_pipe = (speed) => (dt) => (selected_pipe) => {
    return merge(selected_pipe)({x: selected_pipe.x - speed*dt})
}

//atualiza todos os canos da tela(mudando suas posições)
const update_pipes = (execution) => (state) => {
    if(state.scene === "play")
    {
        const new_gap = map(120, 160)(execution.seed)
        const new_pos = map(canvas.height/5, 4*canvas.height/5)(execution.seed)
        const updated_clock = state.pipes.clock + execution.dt
        const added_pairs = updated_clock > 1500 ? [...state.pipes.pairs, pipe_pair(canvas.width, new_pos, new_gap)] : [...state.pipes.pairs]
        const moved_pairs = added_pairs.map((x) => merge(x)({floor_pipe: move_pipe(state.speed)(execution.dt)(x.floor_pipe), sky_pipe: move_pipe(state.speed)(execution.dt)(x.sky_pipe)}))
        //const on_screen_pairs = moved_pairs.filter((x) => x.floor_pipe.x + 52 < 0)
        const new_clock = updated_clock > 1500 ? 0 : updated_clock
        return {pairs: [...moved_pairs], clock: new_clock}
    }
    return {pairs: [], clock: 0}
}
//gera um novo estado do jogo
const next_state = specEvent({
    canvas: keep("canvas"),
    context: keep("context"),
    spritesheet: keep("spritesheet"),
    spritesheet2: keep("spritesheet2"),
    initial_screen: keep("initial_screen"),
    speed: keep("speed"),
    pipes: update_pipes,
    floor: move_scenario_object('floor'),
    background: move_scenario_object('background'),
    player: next_player("player"),
    player2: next_player("player2"),
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
        draw_game_object(state.context)(state.spritesheet2)(state.player2)
        state.pipes.pairs.map((x) => {
          draw_game_object(state.context)(state.spritesheet)(x.floor_pipe)
          draw_game_object(state.context)(state.spritesheet)(x.sky_pipe)
      })
    }
    else {
        draw_game_object(state.context)(state.spritesheet)(state.initial_screen)
    }
}

//estado inicial do jogo
let game = {
    canvas : Object.freeze(document.getElementById('canvas')),
    context : Object.freeze(canvas.getContext('2d')),
    spritesheet: Object.freeze(sprite),
    spritesheet2: Object.freeze(sprite2),
    speed: 0.25,
    scene: "start",
    floor: {
        spriteX: 0,
        spriteY: 610,
        swidth: 224,
        sheight: 112,
        width: canvas.width,
        height: 112,
        x: 0,
        y: canvas.height - 112,
    },
    player2: {
      spriteX: 0,
      spriteY: 0,
      swidth: 33,
      sheight: 24,
      width: 33,
      height: 24,
      x: canvas.width / 2 - 16,
      y: 50,
      v: 0,
      key: "p"
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
      key: "w"
    },
    background : {
        spriteX: 390,
        spriteY: 0,
        swidth: 275,
        sheight: 204,
        width: canvas.width,
        height: canvas.height + 50,
        x: 0,
        y: -50
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
    pipes: {pairs: [], clock: 0}
}

// trecho não funcional
//variável que armazena quando a tecla "w" é apertada e a variação de tempo entre um frame e outro
let global_event = {w: false, p: false }

//atualiza os frames e o estado do jogo
//atualiza os frames e o estado do jogo
const loop = (t1) => (t2) => {
  // atualiza o jogo
  game = next_state({dt: t2 - t1, seed: Math.random(), keyboard: global_event})(game);

  // renderiza o jogo na tela
  draw_game(game);
  //chama a função de novo
  window.requestAnimationFrame(loop(t2));
};

//atualiza a variável global quando a tecla "w" é apertada e solta
window.addEventListener("keypress", (e) => {
  if (e.key === "w" && global_event.w === false) {
    global_event.w = true
  }
  if (e.key === "p" && global_event.p === false) {
    global_event.p = true
  }
})
window.addEventListener("keyup", (e) => {
  if (e.key === "w") {
    global_event.w = false
  }
  if (e.key === "p") {
    global_event.p = false
  }
})
//roda o jogo
loop(0)(0)