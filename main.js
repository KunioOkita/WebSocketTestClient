window.onload = function() {
  var port;
  var ws;
  var showMsgElem = document.getElementById('recive_msg');
  var showSendMsgElem = document.getElementById('send_msg');
  var msg_count = 0;
  var send_msg_count = 0;
  var current_response_msg = {};
  var res_msg_list = [];

  refreshMsgKeylist(true);

  function refreshMsgKeylist(txtRefresh) {
    // メッセージリストを設定する
    var _keylistStr = localStorage.getItem('keylist');
    var _keylist = [];
    if (_keylistStr) {
      // 子要素削除
      $('#msg_type').empty();
      _keylist = JSON.parse(_keylistStr);
      for (var cnt = 0; cnt < _keylist.length; cnt++) {
        var optElem = '';
        if (cnt == 0 && txtRefresh) {
          $('#ws_msg input[name="msg_key"]').val(_keylist[cnt]);
          $('#ws_msg textarea[name="message"]').val(localStorage.getItem(_keylist[cnt]));
        }
        optElem = '<option value="' + _keylist[cnt] + '">' + _keylist[cnt] +'</option>';
        $('#msg_type').append(optElem);
      }
    }
  }

  $('#ws_connect input[name="connect"]').click(function() {
    var url = $('#ws_connect input[name="connect_url"]').val();
    toggleForm();

    ws = new WebSocket(url);
    ws.onopen = function() {
      $('#main_header').addClass('connect');
    };

    ws.onclose = function() {
      $('#main_header').removeClass('connect');
      toggleForm();
      current_response_msg = {};
    };

    ws.onmessage = function(msg) {
      var msg_data = "";
      try {
        msg_data = JSON.parse(msg.data);
      } catch (e) {
        msg_data = msg.data;
      }
      msg_count++;
      current_response_msg = msg_data;
      res_msg_list.push(msg_data);
      writeMessageToDisplay(msg.data, showMsgElem, msg_count);
    };
  });

  $('#ws_msg input[name="socket_close"]').click(function() {
    ws.close();
  });

  // 送信メッセージを登録する
  $('#ws_msg input[name="register"]').click(function() {
    var key = window.prompt("メッセージ識別子を入力して下さい。(任意の文字列)", "");
    if (key === '') {
      alert('empty!');
      return;
    }

    var keylistStr = localStorage.getItem('keylist');
    var keylist = [];
    if (keylistStr) {
      keylist = JSON.parse(keylistStr);
    }

    // 存在しない場合な追加
    if (keylist.indexOf(key) < 0) {
      keylist.push(key);
      localStorage.setItem('keylist', JSON.stringify(keylist));
    }

    var val = $('#ws_msg textarea[name="message"]').val();
    localStorage.setItem(key, val);

    // keyを設定
    $('#ws_msg input[name="msg_key"]').val(key);

    // メッセージリスト更新
    refreshMsgKeylist(false);
  });

  // 送信メッセージを削除する
  $('#ws_msg input[name="msg_remove"]').click(function() {
    var key = $('#ws_msg input[name="msg_key"]').val();

    var ret = window.confirm('メッセージID "' + key + '" を削除します');
    if (!ret) {
      return;
    }

    var keylistStr = localStorage.getItem('keylist');
    if (!keylistStr) {
      return;
    }

    // keylistからの削除
    var keylist = JSON.parse(keylistStr);
    for (var i = 0; i < keylist.length; i++) {
      if (key === keylist[i]) {
        keylist.splice(i, 1);
        localStorage.setItem('keylist', JSON.stringify(keylist));
      }
    }

    // メッセージ削除
    localStorage.removeItem(key);

    refreshMsgKeylist();
  });

  $('#ws_msg input[name="send"]').click(function() {
    var val = $('#ws_msg textarea[name="message"]').val();
    var msg_type = $('#ws_msg select').val();
    var msg = {};
    var cnt = 0;
    var res_msg_len = 0;
    var tmp ={};
    var sendMsg = "";

    //sendの回数を取得 add 20141016 yamamoto
    var times = $('#ws_msg input[name="time"]').val();

    // value整形
    try {
      sendMsg = JSON.parse(val);
    } catch (e) {
      sendMsg = val;
    }

    try {
      for (var i = 0; i < times; i++) {
        send_msg_count++;
        writeMessageToDisplay(sendMsg, showSendMsgElem, send_msg_count);
        sendSocketMsg(ws, sendMsg);
      }
    } catch(e) {
      console.log(e);
    }
  });

  $('#message_box input[name="clear_all"]').click(function() {
    msg_count = 0;
    send_msg_count = 0;
    current_response_msg = {};
    showMsgElem.innerText = "";
    showSendMsgElem.innerText = "";
    res_msg_list = [];
  });

  $('#ws_msg input[name="clear_msg"]').click(function() {
    msg_count = 0;
    send_msg_count = 0;
    showMsgElem.innerText = "";
    showSendMsgElem.innerText = "";
  });

  $('#ws_msg select').bind('change', function() {
    var type = $('#ws_msg option:selected').val();
    setJSONTemplate(type);
  });
};

function toggleForm() {
  $('#ws_connect').toggle();
  $('#ws_msg').toggle();
};

function getDate() {
  var targetDate = new Date();
  var year = targetDate.getFullYear(); // 年
  var mon  = ('0'+(targetDate.getMonth()+1)).slice(-2); // 月
  var date = ('0'+(targetDate.getDate())).slice(-2); // 日
  var hour = ('0'+(targetDate.getHours())).slice(-2); // 時
  var min  = ('0'+(targetDate.getMinutes())).slice(-2); // 分
  var sec  = ('0'+(targetDate.getSeconds())).slice(-2); // 秒
  var msec = ('00'+(targetDate.getMilliseconds())).slice(-3); // ミリ秒
  return (year+'/'+mon+'/'+date + ' ' + hour+':'+min+':'+sec+'.'+msec);
}

function setJSONTemplate(key) {
  var data = "";
  var $tArea = $('#ws_msg textarea');
  console.log(key);
  $tArea.val(localStorage.getItem(key));
  $('#ws_msg input[name="msg_key"]').val(key);
}

function writeMessageToDisplay(msg, elem, count) {
  var txt = elem.innerText;
  var sendMsg = msg;
  if (typeof msg === "object") {
    sendMsg = JSON.stringify(msg);
  }

  var data = '';
  if ($('#display_raw_msg').prop('checked')) {
    data = getDate() + ' ' + sendMsg;
  } else {
    data = getDate() + ' ' + bytes2(sendMsg) + 'bytes';
  }

  var line = ('00000'+count).slice(-5) + ': ' + data;
  elem.innerText = txt + line + "\n";
}

function sendSocketMsg(ws, msg) {
  var sendMsg = msg;
  if (typeof msg === "object") {
    sendMsg = JSON.stringify(msg);
  }
  ws.send(sendMsg);
}

function bytes2(str) {
  return(encodeURIComponent(str).replace(/%../g,"x").length);
}
