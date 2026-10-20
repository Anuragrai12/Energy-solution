<?php
ini_set('display_errors', '1');
error_reporting(E_ALL);
echo 'PHP ' . phpversion() . '<br>';
echo 'mysqli: ' . (extension_loaded('mysqli') ? 'yes' : 'NO') . '<br>';