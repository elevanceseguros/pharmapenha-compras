import test from 'node:test';
import assert from 'node:assert/strict';
import {isFinanceRole,canUseAction,canOpenView,initialViewForRole} from '../src/access.js';

test('perfil financeiro entra direto na agenda',()=>assert.equal(initialViewForRole('finance'),'payables'));
test('perfil financeiro não abre telas de compras',()=>{assert.equal(canOpenView('finance','home'),false);assert.equal(canOpenView('financeiro','plan'),false);assert.equal(canOpenView('finance','payables'),true)});
test('perfil financeiro só executa ações da agenda',()=>{assert.equal(canUseAction('finance','manual-payable'),true);assert.equal(canUseAction('finance','payables-filter'),true);assert.equal(canUseAction('finance','new-round'),false);assert.equal(canUseAction('finance','cloud-delete'),false)});
test('demais perfis mantêm o acesso existente',()=>{assert.equal(isFinanceRole('buyer'),false);assert.equal(canOpenView('admin','plan'),true);assert.equal(canUseAction('buyer','new-round'),true)});
