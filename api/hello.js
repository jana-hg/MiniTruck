module.exports = (req, res) => {
  try {
    const express = require('express');
    res.status(200).json({ ok: true, msg: typeof express });
  } catch (e) {
    res.status(500).json({ e: e.message, stack: e.stack });
  }
};
