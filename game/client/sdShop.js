

import sdWorld from '../sdWorld.js';


import sdEntity from '../entities/sdEntity.js';
import sdGun from '../entities/sdGun.js';
import sdBlock from '../entities/sdBlock.js';
import sdCrystal from '../entities/sdCrystal.js';
import sdBG from '../entities/sdBG.js';
import sdTurret from '../entities/sdTurret.js';
import sdArea from '../entities/sdArea.js';
import sdWater from '../entities/sdWater.js';
import sdDoor from '../entities/sdDoor.js';
import sdCaption from '../entities/sdCaption.js';

import sdRenderer from './sdRenderer.js';
import sdContextMenu from './sdContextMenu.js';


class sdShop
{
	static init_class()
	{
		console.log('sdShop class initiated');
		
		sdShop.open = false;
		sdShop.options = [];
		sdShop.options_snappack = null; // Generated on very first connection. It means shop items can not be changed after world initialization, but not only because of that (shop data is sent only once per connection)
		
		sdShop.scroll_y = 0;
		sdShop.scroll_y_target = 0;
		
		sdShop.current_category = 'root'; // root category
		
		sdShop.max_y = 0;
		
		sdShop.isDrawing = false;
		
		sdShop.options.push({ _class: null, image: 'return', _category:'!root',  _opens_category:'root' });
		sdShop.options.push({ _class: 'sdBlock', width: 32, height: 32, _category:'root', _opens_category:'Walls' });
		sdShop.options.push({ _class: 'sdBG', width: 32, height: 32, material: sdBG.MATERIAL_PLATFORMS, _category:'root', _opens_category:'Background walls' });
		sdShop.options.push({ _class: 'sdDoor', width: 32, height: 32, _category:'root', _opens_category:'Doors' });
		sdShop.options.push({ _class: 'sdCom', _category:'root', _opens_category:'Base equipment' });
		sdShop.options.push({ _class: 'sdGun', class: sdGun.CLASS_RIFLE, _category:'root', _opens_category:'Equipment' });
		sdShop.options.push({ _class: null, image: 'vehicle', _category:'root', _opens_category:'Vehicles' });
		sdShop.options.push({ _class: null, image: 'upgrade', _category:'root', _opens_category:'upgrades' });
		sdShop.options.push({ _class: 'sdGun', class: sdGun.CLASS_POPCORN, _category:'root', _opens_category:'Other' });
		sdShop.options.push({ _class: null, image: 'com_red', _category:'root', _godmode_only: true, _opens_category:'Admin tools' }); // Cost of Infinity is what actually prevents items here from being accessible to non-in-godmode-admins
		
		if ( globalThis.isWin )
		sdShop.options.push({ _class: 'sdVirus', _category:'root', _opens_category:'Development tests' });
	
		sdShop.options.push({ _class: 'sdBall', _category:'Other' });
		sdShop.options.push({ _class: 'sdTheatre', _category:'Other' });
		sdShop.options.push({ _class: 'sdBeamProjector', _category:'Other', _min_build_tool_level: 3 });
		
		sdShop.options.push({ _class: 'sdHover', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHover', filter: 'hue-rotate(90deg) saturate(2)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHover', filter: 'hue-rotate(180deg) saturate(2)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHover', filter: 'hue-rotate(270deg) saturate(2)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHover', type: 1, _category:'Vehicles', _min_build_tool_level: 3 });
		sdShop.options.push({ _class: 'sdHover', type: 1, filter: 'hue-rotate(90deg) saturate(2)', _category:'Vehicles', _min_build_tool_level: 3 });
		sdShop.options.push({ _class: 'sdHover', type: 1, filter: 'hue-rotate(180deg) saturate(2)', _category:'Vehicles', _min_build_tool_level: 3 });
		sdShop.options.push({ _class: 'sdHover', type: 1, filter: 'hue-rotate(270deg) saturate(2)', _category:'Vehicles', _min_build_tool_level: 3 });
		sdShop.options.push({ _class: 'sdLifeBox', _category:'Vehicles', _min_build_tool_level:1 });
		sdShop.options.push({ _class: 'sdQuadro', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'hue-rotate(300deg)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'hue-rotate(270deg)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'hue-rotate(210deg)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'hue-rotate(140deg)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'saturate(0) brightness(1.5)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdQuadro', filter: 'saturate(0) brightness(0.5)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHoverBike', filter: 'saturate(0) brightness(1.5)', _category:'Vehicles' });
		sdShop.options.push({ _class: 'sdHoverBike', filter: 'saturate(0) brightness(0.5)', _category:'Vehicles' });

		//ctx.filter = '' // yellow
		//ctx.filter = '' // redish
		//ctx.filter = '' // pink
		//ctx.filter = '' // blueish
		//ctx.filter = '' // white
		//ctx.filter = '' // black
		
		function AddBuildPack( filter, i )
		{
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 16, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 32, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 32, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 8, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL1, _reinforced_level: 1, _category:'Walls', _min_build_tool_level: 2 });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 16, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL1, _reinforced_level: 1, _category:'Walls', _min_build_tool_level: 2 });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 32, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL1, _reinforced_level: 1, _category:'Walls', _min_build_tool_level: 2 });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 32, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL1, _reinforced_level: 1, _category:'Walls', _min_build_tool_level: 2 });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 8, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL1, _reinforced_level: 1, _category:'Walls', _min_build_tool_level: 2 });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 8, filter: filter, _category:'Walls' });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL2, _reinforced_level: 2, _category:'Walls', _min_build_tool_level: 4 });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 16, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL2, _reinforced_level: 2, _category:'Walls', _min_build_tool_level: 4 });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 32, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL2, _reinforced_level: 2, _category:'Walls', _min_build_tool_level: 4 });
			sdShop.options.push({ _class: 'sdBlock', width: 32, height: 32, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL2, _reinforced_level: 2, _category:'Walls', _min_build_tool_level: 4 });
			sdShop.options.push({ _class: 'sdBlock', width: 16, height: 8, filter: filter, material: sdBlock.MATERIAL_REINFORCED_WALL_LVL2, _reinforced_level: 2, _category:'Walls', _min_build_tool_level: 4 });
			
			//if ( i !== 0 )
			//{
				sdShop.options.push({ _class: 'sdBG', width: 32, height: 32, filter: filter + 'brightness(1.5)', material: sdBG.MATERIAL_PLATFORMS_COLORED, _category:'Background walls' });
				sdShop.options.push({ _class: 'sdBG', width: 32, height: 16, filter: filter + 'brightness(1.5)', material: sdBG.MATERIAL_PLATFORMS_COLORED, _category:'Background walls' });
				sdShop.options.push({ _class: 'sdBG', width: 16, height: 32, filter: filter + 'brightness(1.5)', material: sdBG.MATERIAL_PLATFORMS_COLORED, _category:'Background walls' });
				sdShop.options.push({ _class: 'sdBG', width: 16, height: 16, filter: filter + 'brightness(1.5)', material: sdBG.MATERIAL_PLATFORMS_COLORED, _category:'Background walls' });
			//}
		}
		
		for ( var i = 0; i < 11; i++ )
		{
			var filter = ( i === 0 ) ? '' : 'hue-rotate('+(~~(i/12*360))+'deg)';
			
			if ( i === 6 )
			filter += ' saturate(60)';
			if ( i === 7 )
			filter += ' saturate(10)';
			if ( i === 8 )
			filter += ' saturate(4)';
			if ( i === 10 )
			filter += ' saturate(2)';
		
			AddBuildPack( filter, i );
			
			if ( i !== 6 )
			if ( i !== 7 )
			if ( i !== 8 )
			{
				sdShop.options.push({ _class: 'sdDoor', width: 32, height: 32, filter: filter, _category:'Doors' });
				//var filter = ( i === 0 ) ? '' : 'hue-rotate('+(~~(i/12*360))+'deg) contrast(0.75)';
				sdShop.options.push({ _class: 'sdDoor', width: 32, height: 32, filter: filter, model: sdDoor.MODEL_ARMORED, _reinforced_level: 1, _category:'Doors', _min_build_tool_level: 2 });
				sdShop.options.push({ _class: 'sdDoor', width: 32, height: 32, filter: filter, model: sdDoor.MODEL_ARMORED_LVL2, _reinforced_level: 2, _category:'Doors', _min_build_tool_level: 4 });
			}
		}
		AddBuildPack( 'hue-rotate(-90deg) contrast(0.5) brightness(1.5) saturate(0)' );
			
		AddBuildPack( 'hue-rotate(-90deg) saturate(0)' );
		sdShop.options.push({ _class: 'sdDoor', width: 32, height: 32, filter: 'saturate(0)', _category:'Doors' });

		sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, material:sdBlock.MATERIAL_GROUND, _category:'Walls' });
		sdShop.options.push({ _class: 'sdCom', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdCom', variation: 1, _category:'Base equipment', _min_build_tool_level:1 });
		sdShop.options.push({ _class: 'sdCom', variation: 2, _category:'Base equipment', _min_build_tool_level:2 });
		sdShop.options.push({ _class: 'sdCom', variation: 3, _category:'Base equipment', _min_build_tool_level:3 });
		sdShop.options.push({ _class: 'sdCom', variation: 4, _category:'Base equipment', _min_build_tool_level:4 });
		sdShop.options.push({ _class: 'sdCom', variation: 5, _category:'Base equipment', _min_build_tool_level:5 });
		sdShop.options.push({ _class: 'sdCom', variation: 6, _category:'Base equipment', _min_build_tool_level:6 });
		sdShop.options.push({ _class: 'sdCom', variation: 7, _category:'Base equipment', _min_build_tool_level:7 });
		sdShop.options.push({ _class: 'sdTeleport', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdAntigravity', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdLamp', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', filter: 'saturate(0)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', filter: 'none', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', filter: 'hue-rotate(205deg) saturate(10)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', filter: 'hue-rotate(220deg)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', filter: 'hue-rotate(135deg)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', type: 1, filter: 'saturate(0)', _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdStorage', type: 1, filter: 'none', _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdStorage', type: 1, filter: 'hue-rotate(205deg) saturate(10)', _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdStorage', type: 1, filter: 'hue-rotate(220deg)', _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdStorage', type: 1, filter: 'hue-rotate(135deg)', _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdStorage', type: 2, filter: 'saturate(0)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', type: 2, filter: 'none', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', type: 2, filter: 'hue-rotate(205deg) saturate(10)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', type: 2, filter: 'hue-rotate(220deg)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdStorage', type: 2, filter: 'hue-rotate(135deg)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdNode', _category:'Base equipment' });
		

		sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, material:sdBlock.MATERIAL_SHARP, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBlock', width: 32, height: 16, material:sdBlock.MATERIAL_SHARP, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBlock', width: 16, height: 32, material:sdBlock.MATERIAL_SHARP, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBlock', width: 32, height: 32, material:sdBlock.MATERIAL_SHARP, _category:'Base equipment' });
		
		sdShop.options.push({ _class: 'sdBlock', width: 16, height: 16, material:sdBlock.MATERIAL_TRAPSHIELD, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBlock', width: 16, height: 8, material:sdBlock.MATERIAL_TRAPSHIELD, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBlock', width: 8, height: 16, material:sdBlock.MATERIAL_TRAPSHIELD, _category:'Base equipment' });
		
		sdShop.options.push({ _class: 'sdTurret', kind:sdTurret.KIND_LASER, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdTurret', kind:sdTurret.KIND_ROCKET, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdTurret', kind:sdTurret.KIND_RAPID_LASER, _category:'Base equipment', _min_build_tool_level: 2 });
		sdShop.options.push({ _class: 'sdTurret', kind:sdTurret.KIND_SNIPER, _category:'Base equipment', _min_build_tool_level: 3 });
		/*sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640 / 2, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640 * 2, _category:'Base equipment' });*/
		sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640 * 2 * 2, _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640 * 2 * 2 * 2, _category:'Base equipment', _min_build_tool_level: 2 });
		sdShop.options.push({ _class: 'sdMatterAmplifier', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdMatterAmplifier', multiplier: 2, _category:'Base equipment', _min_build_tool_level: 1 });
		sdShop.options.push({ _class: 'sdMatterAmplifier', multiplier: 3, _category:'Base equipment', _min_build_tool_level: 2 });
		sdShop.options.push({ _class: 'sdMatterAmplifier', multiplier: 4, _category:'Base equipment', _min_build_tool_level: 3 });
		sdShop.options.push({ _class: 'sdCommandCentre', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdCrystalCombiner', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdRescueTeleport', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdBaseShieldingUnit', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdConveyor', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdConveyor', filter:'sepia(1) saturate(2) hue-rotate(30deg) brightness(0.8)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdConveyor', filter:'sepia(1) saturate(1.5) hue-rotate(170deg) brightness(0.7)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdConveyor', filter:'sepia(1) saturate(2) hue-rotate(220deg) brightness(0.7)', _category:'Base equipment' });
		sdShop.options.push({ _class: 'sdConveyor', filter:'sepia(1) saturate(1.7) hue-rotate(300deg) brightness(0.7)', _category:'Base equipment' });
		
		
		for ( let i = 0; i < sdCaption.colors.length / 3; i++ )
		sdShop.options.push({ _class: 'sdCaption', type: i, _category:'Base equipment' });
	
		sdShop.options.push({ _class: 'sdUpgradeStation', _category:'Base equipment', _min_build_tool_level: 1  });
		sdShop.options.push({ _class: 'sdWorkbench', _category:'Base equipment', _min_build_tool_level: 2  });
		
		for ( var i = 0; i < 3; i++ )
		{
			let filter = '';
			if ( i === 1 )
			filter = 'brightness(0.5)';
			if ( i === 2 )
			filter = 'brightness(1.5)';
			sdShop.options.push({ _class: 'sdBG', width: 32, height: 32, filter: filter, _category:'Background walls' });
			sdShop.options.push({ _class: 'sdBG', width: 32, height: 16, filter: filter, _category:'Background walls' });
			sdShop.options.push({ _class: 'sdBG', width: 16, height: 32, filter: filter, _category:'Background walls' });
			sdShop.options.push({ _class: 'sdBG', width: 16, height: 16, filter: filter, _category:'Background walls' });
		}
		
		//sdShop.options.push({ _class: 'sdWater' });
		
		for ( var i = 0; i < sdGun.classes.length; i++ )
		{
			if ( sdGun.classes[ i ].spawnable !== false )
			{
				sdShop.options.push({
					_class: 'sdGun',
					class: i, 
					_category: ( sdGun.classes[ i ].category || 'Equipment' ),
					_min_build_tool_level: sdGun.classes[ i ].min_build_tool_level || 0,
					_min_workbench_level: sdGun.classes[ i ].min_workbench_level || 0 // For workbench items
				});
			}
			//else
			if ( globalThis.isWin )
			{
				if ( i === sdGun.CLASS_BUILDTOOL_UPG )
				{
					sdShop.options.push({
						_class: 'sdGun',
						class: i,
						extra: 0,
						_category:'Development tests'
					});
					sdShop.options.push({
						_class: 'sdGun',
						class: i,
						extra: 1,
						_category:'Development tests'
					});
					sdShop.options.push({
						_class: 'sdGun',
						class: i,
						extra: -123,
						_category:'Development tests'
					});
					sdShop.options.push({
						_class: 'sdGun',
						class: i,
						extra: 2,
						_category:'Development tests'
					});
				}
				else
				{
					sdShop.options.push({
						_class: 'sdGun',
						class: i, 
						_category:'Development tests'
					});
				}
			}
		}
		sdShop.options.push({ _class: 'sdBomb', _category:'Equipment' });
		sdShop.options.push({ _class: 'sdBarrel', _category:'Equipment' });
		sdShop.options.push({ _class: 'sdBarrel', filter: 'hue-rotate(130deg) saturate(10)', variation: 1, _category:'Equipment', _min_build_tool_level:1 });
		sdShop.options.push({ _class: 'sdBarrel', filter: 'hue-rotate(300deg) saturate(20)', variation: 2, _category:'Equipment', _min_build_tool_level:2 });
		sdShop.options.push({ _class: 'sdBarrel', filter: 'hue-rotate(30deg) saturate(20)', variation: 3, _category:'Equipment', _min_build_tool_level:3 });

		sdShop.upgrades = {
			upgrade_suit:
			{
				max_level: 3,
				matter_cost: 120,
				action: ( character, level_purchased )=>
				{
					character.hmax = Math.round( 130 + level_purchased / 3 * 120 );
				}
			},
			upgrade_damage:
			{
				max_level: 3,
				matter_cost: 100,
				action: ( character, level_purchased )=>
				{
					character._damage_mult = 1 + level_purchased / 3 * 1;
				}
			},
			upgrade_build_hp:
			{
				max_level: 3,
				matter_cost: 120,
				action: ( character, level_purchased )=>
				{
					character._build_hp_mult = 1 + level_purchased / 3 * 3;
				}
			},
			upgrade_energy:
			{
				max_level: 40,
				matter_cost: 45,
				action: ( character, level_purchased )=>
				{
					character.matter_max = Math.round( 50 + level_purchased * 45 ); // Max is 1850
				}
			},
			upgrade_hook:
			{
				max_level: 1,
				matter_cost: 75,
				action: ( character, level_purchased )=>
				{
					character._hook_allowed = true;
				}
			},
			upgrade_jetpack:
			{
				max_level: 1,
				matter_cost: 75,
				action: ( character, level_purchased )=>
				{
					character._jetpack_allowed = true;
				}
			},
			upgrade_invisibility:
			{
				max_level: 1,
				matter_cost: 150,
				action: ( character, level_purchased )=>
				{
					character._ghost_allowed = true;
				}
			},
			/*upgrade_coms:
			{
				max_level: 1,
				matter_cost: 75,
				action: ( character, level_purchased )=>
				{
					character._coms_allowed = true;
				}
			},*/
			upgrade_matter_regeneration: // Upgrade idea & pull request by Booraz149 ( https://github.com/Booraz149 )
			{
				max_level: 5,
				matter_cost: 200,
				action: ( character, level_purchased )=>
				{
					character._matter_regeneration = level_purchased;
				}
			},
			upgrade_recoil_reduction: // Upgrade idea & pull request by Booraz149 ( https://github.com/Booraz149 )
			{
				max_level: 5,
				matter_cost: 150,
				action: ( character, level_purchased )=>
				{
					character._recoil_mult = 1 - ( 0.0055 * level_purchased ) ; // Small recoil reduction, don't want rifles turn to laser beams
				}
			},
			upgrade_underwater_breath_capacity: // Upgrade idea & pull request by Booraz149 ( https://github.com/Booraz149 )
			{
				max_level: 3,
				matter_cost: 100,
				action: ( character, level_purchased )=>
				{
					character._air_upgrade = 1 + level_purchased ; // 
				}
			},
			upgrade_jetpack_fuel_cost_reduction: // Upgrade idea & pull request by Booraz149 ( https://github.com/Booraz149 )
			{
				max_level: 5,
				matter_cost: 150,
				min_build_tool_level: 1,
				action: ( character, level_purchased )=>
				{
					character._jetpack_fuel_multiplier = 1 - ( 0.15 * level_purchased ); // Max 75% fuel cost reduction
				}
			},
			upgrade_matter_regeneration_speed: // Upgrade idea & pull request by Booraz149 ( https://github.com/Booraz149 )
			{
				max_level: 3,
				matter_cost: 200,
				min_build_tool_level: 2,
				action: ( character, level_purchased )=>
				{
					character._matter_regeneration_multiplier = 1 + level_purchased;
				}
			},
		};
		for ( var i in sdShop.upgrades )
		{
			sdShop.upgrades[ i ].image = sdWorld.CreateImageFromFile( i );
			sdShop.options.push({ _class: null, matter_cost: sdShop.upgrades[ i ].matter_cost, upgrade_name: i, 
				_category:'upgrades', _min_build_tool_level: sdShop.upgrades[ i ].min_build_tool_level || 0 });
		}
		
		if ( globalThis.isWin ) // Lack of this check will probably allow creation of these entities even if category can not be opened in normal way
		{
			sdShop.options.push({ _class: 'sdOctopus', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdQuickie', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdVirus', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdAmphid', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCharacter', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdAsteroid', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCube', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCube', kind:1, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCube', kind:2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCube', kind:3, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdWater', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdWater', type: sdWater.TYPE_LAVA, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdAsp', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdSandWorm', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdGrass', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdSlug', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdEnemyMech', _category:'Development tests' });
			//sdShop.options.push({ _class: 'sdMatterContainer', matter_max:640 * 2 * 2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdJunk', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdBadDog', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdShark', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdWorkbench', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdRift', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdRift', type: 2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCrystal', tag: 'deep', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCrystal', tag: 'deep', matter_max: 5120, _category:'Development tests' }); // Glowing one
			sdShop.options.push({ _class: 'sdCrystal', tag: 'deep', matter_max: sdCrystal.anticrystal_value, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCrystal', type: 2, tag: 'deep', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdCrystal', type: 2, tag: 'deep', matter_max: 5120 * 4, _category:'Development tests' }); // Glowing one
			sdShop.options.push({ _class: 'sdCrystal', type: 2, tag: 'deep', matter_max: sdCrystal.anticrystal_value * 4, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdDrone', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdLost', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdGun', class:sdGun.CLASS_LOST_CONVERTER, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdGun', class:sdGun.CLASS_CABLE_TOOL, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdSpider', _ai_team: 2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdSpider', type: 1, _ai_team: 2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdDrone', _ai_team: 2, type: 2, _category:'Development tests' });
			sdShop.options.push({ _class: 'sdPlayerDrone', _category:'Development tests' });
			sdShop.options.push({ _class: 'sdBeamProjector', _category:'Development tests' });
			
			sdShop.options.push({ _class: 'sdQuadro', _category:'Development tests' });
		}
		
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_PREVENT_DAMAGE, size:256, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_PREVENT_DAMAGE, size:128, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_PREVENT_DAMAGE, size:64, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_PREVENT_DAMAGE, size:32, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_PREVENT_DAMAGE, size:16, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdArea', type:sdArea.TYPE_ERASER_AREA, size:16, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdGun', class:sdGun.CLASS_ADMIN_REMOVER, _category:'Admin tools' });
		sdShop.options.push({ _class: 'sdGun', class:sdGun.CLASS_ADMIN_TELEPORTER, _category:'Admin tools' });
		
		
		sdShop.potential_selection = -1;
	}
	static Draw( ctx )
	{
		sdShop.isDrawing = true;
		
		if ( !sdWorld.my_entity )
		{
			sdShop.open = false;
			return;
		}
		
		let old_active_build_settings = sdWorld.my_entity._build_params;
			
		ctx.fillStyle = 'rgb(0,0,0)';
		ctx.globalAlpha = 0.8;
		ctx.fillRect( 20, 20, sdRenderer.screen_width - 40, sdRenderer.screen_height - 40 );
		ctx.globalAlpha = 1;
		
		ctx.save();
		{
			let region = new Path2D();
			region.rect(20, 20, sdRenderer.screen_width - 40, sdRenderer.screen_height - 40);
			ctx.clip(region, "evenodd");

			if ( sdShop.scroll_y_target < -( sdShop.max_y + 80 + 25 ) + sdRenderer.screen_height * 1 )
			sdShop.scroll_y_target = -( sdShop.max_y + 80 + 25 ) + sdRenderer.screen_height * 1;

			if ( sdShop.scroll_y_target > 0 )
			sdShop.scroll_y_target = 0;
		
			//sdShop.max_y

			//if ( sdShop.scroll_y_target < -( Math.ceil( sdShop.options.length / 7 ) * ( 32 + 16 ) * 2 ) + sdRenderer.screen_height - 50 )
			//sdShop.scroll_y_target = -( Math.ceil( sdShop.options.length / 7 ) * ( 32 + 16 ) * 2 ) + sdRenderer.screen_height - 50;

			sdShop.scroll_y = sdWorld.MorphWithTimeScale( sdShop.scroll_y, sdShop.scroll_y_target, 0.5, 1 );

			let xx = 40;
			let yy = 40 + sdShop.scroll_y;

			sdShop.potential_selection = -1;
			//let skip = 0; // Skip current_shop_options.push if an item is not unlocked yet
			let current_shop_options = [];
			for ( var i = 0; i < sdShop.options.length; i++ )
			{
				if ( sdShop.options[ i ]._godmode_only !== true || ( sdWorld.my_entity && sdWorld.my_entity._god ) )
				if ( sdShop.options[ i ]._category === sdShop.current_category || 
					 ( sdShop.options[ i ]._category.charAt( 0 ) === '!' && sdShop.options[ i ]._category.substring( 1 ) !== sdShop.current_category ) ) // !root case
				{
					/*
					if ( sdShop.options[ i ]._category === 'Equipment' ) // Equipment category unlockables go here
					{
						if ( ( sdShop.options[ i ].class === sdGun.CLASS_PISTOL_MK2 || sdShop.options[ i ].class === sdGun.CLASS_LMG_P04 ) && sdWorld.my_entity.build_tool_level <= 0 )
						skip = 1;
						if ( ( sdShop.options[ i ]._class === 'sdBarrel' && sdShop.options[ i ].variation === 1 ) && sdWorld.my_entity.build_tool_level <= 0 )
						skip = 1;
					}
					if ( sdShop.options[ i ]._category === 'Base equipment' ) // Base equipment category unlockables go here
					{
						if ( ( sdShop.options[ i ]._class === 'sdCom' && sdShop.options[ i ].variation === 1 ) && sdWorld.my_entity.build_tool_level <= 0 )
						skip = 1;
					}*/
					
					/*if ( sdShop.options[ i ]._min_build_tool_level || 0 > sdWorld.my_entity.build_tool_level )
					skip = 1;
					
					if ( skip === 0 )
					current_shop_options.push( sdShop.options[ i ] );
				
					sdShop.options[ i ]._main_array_index = i;
					skip = 0; // reset
					*/
					
					if ( ( sdShop.options[ i ]._min_build_tool_level || 0 ) > sdWorld.my_entity.build_tool_level )
					continue;

					if ( ( sdShop.options[ i ]._min_workbench_level || 0 ) > sdWorld.my_entity.workbench_level )
					continue;
				
					current_shop_options.push( sdShop.options[ i ] );
					
					sdShop.options[ i ]._main_array_index = i;
				}
			}
			
			for ( var i = 0; i < current_shop_options.length; i++ )
			{
				sdWorld.my_entity._build_params = current_shop_options[ i ];

				ctx.save();
				ctx.translate( xx, yy );
				ctx.scale( 2, 2 );

				let matter_cost = Infinity;

				let ent = null;

				let selectable = true;
				let max_level = 0;
				let cur_level = 0;

				
				if ( sdWorld.my_entity._build_params._class === null )
				{
					if ( typeof sdWorld.my_entity._build_params._opens_category !== 'undefined' )
					{
						matter_cost = 0;
					}
					else
					{
						matter_cost = sdWorld.my_entity._build_params.matter_cost;

						max_level = sdShop.upgrades[ sdWorld.my_entity._build_params.upgrade_name ].max_level;
						cur_level = ( sdWorld.my_entity._upgrade_counters[ sdWorld.my_entity._build_params.upgrade_name ] || 0 );

						if ( cur_level >= max_level )
						selectable = false;
					}
				}
				else
				{
					ent = sdWorld.my_entity.CreateBuildObject( false );
					ent.x = -100;
					ent.y = 0;

					if ( typeof sdWorld.my_entity._build_params._opens_category !== 'undefined' )
					{
						matter_cost = 0;
					}
					else
					matter_cost = ent.MeasureMatterCost();
				}

				if ( selectable )
				{
					ctx.globalAlpha = 0.2;
					if ( sdWorld.my_entity.matter >= matter_cost )
					{
						ctx.fillStyle = 'rgb(0,255,0)';
					}
					else
					{
						ctx.fillStyle = 'rgb(255,0,0)';
					}

					if ( sdWorld.mouse_screen_x >= xx - 10 )
					if ( sdWorld.mouse_screen_x < xx + 64 + 10 )
					if ( sdWorld.mouse_screen_y >= yy - 10 )
					if ( sdWorld.mouse_screen_y < yy + 64 + 10 )
					if ( sdShop.potential_selection === -1 )
					{
						sdShop.potential_selection = sdWorld.my_entity._build_params._main_array_index; // i;
						
						ctx.fillStyle = 'rgb(255,255,0)';
						ctx.globalAlpha = 0.3;
					}
					ctx.fillRect( -5,-5, 32+10,32+10 );
					ctx.globalAlpha = 1;
				}

				

				if ( sdWorld.my_entity._build_params._cache )
				{
					ctx.drawImage( sdWorld.my_entity._build_params._cache, 0,0 );
				}
				else
				{
					var canvas = document.createElement('canvas');
					canvas.width  = 32;
					canvas.height = 32;
					
					let ctx2 = canvas.getContext("2d");
					sdRenderer.AddCacheDrawMethod( ctx2 );
					
					ctx2.imageSmoothingEnabled = false;
					
					if ( ent )
					{
						sdRenderer.unavailable_image_collector = [];
						
						ctx2.translate( ~~( 16 - ( ent._hitbox_x2 + ent._hitbox_x1 ) / 2 ), 
										~~( 16 - ( ent._hitbox_y2 + ent._hitbox_y1 ) / 2 ) );

						ctx2.save();
						ent.DrawBG( ctx2, false );
						ctx2.restore();
						
						ctx2.save();
						ent.Draw( ctx2, false );
						ctx2.restore();
						
						ctx2.save();
						ent.DrawFG( ctx2, false );
						ctx2.restore();
						
						let unavaulable_images = sdRenderer.unavailable_image_collector;
						sdRenderer.unavailable_image_collector = null;
						
						let obj = sdWorld.my_entity._build_params;
						for ( let i = 0; i < unavaulable_images.length; i++ )
						{
							unavaulable_images[ i ].callbacks.push( ()=>
							{
								obj._cache = null;
							});
						}
					}
					else
					if ( sdWorld.my_entity._build_params.image )
					{
						if ( !sdWorld.my_entity._build_params.image_obj /*|| !sdWorld.my_entity._build_params.image_obj.loaded*/ )
						{
							let obj = sdWorld.my_entity._build_params;
							sdWorld.my_entity._build_params.image_obj = sdWorld.CreateImageFromFile( sdWorld.my_entity._build_params.image, ()=>
							{
								obj._cache = null;
							});
							sdWorld.my_entity._build_params.image_obj.RequiredNow();
						}
						
						ctx2.drawImage( sdWorld.my_entity._build_params.image_obj, 0,0, 32,32 );
					}
					else
					{
						if ( !sdShop.upgrades[ sdWorld.my_entity._build_params.upgrade_name ].image.loaded )
						{
							let obj = sdWorld.my_entity._build_params;
							sdShop.upgrades[ obj.upgrade_name ].image.callbacks.push( ()=>
							{
								obj._cache = null;
							});
							sdShop.upgrades[ obj.upgrade_name ].image.RequiredNow();
						}
						
						ctx2.drawImage( sdShop.upgrades[ sdWorld.my_entity._build_params.upgrade_name ].image, 0,0, 32,32 );
					}
					
					sdWorld.my_entity._build_params._cache = canvas;
				}
				
				if ( ent )
				{
					ctx.translate( 16 - ( ent._hitbox_x2 + ent._hitbox_x1 ) / 2, 16 - ( ent._hitbox_y2 + ent._hitbox_y1 ) / 2 );
					
					ent.remove();
					ent._remove();
				}
				
				
				if ( max_level > 0 )
				{
					ctx.fillStyle = '#ffffff';
					ctx.font = "4.5px Verdana";
					ctx.textAlign = 'right';
					ctx.fillText( cur_level + " / " + max_level, 32, 32 );
				}

				ctx.restore();

				xx += ( 32 + 16 ) * 2;
				if ( xx + ( 32 ) * 2 > sdRenderer.screen_width - 40 )
				{
					xx = 40;
					yy += ( 32 + 16 ) * 2;
				}
			}
			
			sdShop.max_y = yy - sdShop.scroll_y;
		}
		ctx.restore();
		
		if ( sdShop.potential_selection !== -1 )	
		{
			const capitalize = (s) => {
				if (typeof s !== 'string') return '';
				return s.charAt(0).toUpperCase() + s.slice(1);
			};

			ctx.font = "12px Verdana";
			
			let t = 'No description for ' + JSON.stringify( sdShop.options[ sdShop.potential_selection ] );
			
			if ( sdShop.options[ sdShop.potential_selection ]._opens_category )
			{
				if ( sdShop.options[ sdShop.potential_selection ]._opens_category === 'root' )
				t = 'Click to leave this category';
				else
				t = 'Click to enter category "' + sdShop.options[ sdShop.potential_selection ]._opens_category + '"';
			}
			else
			{
				if ( sdShop.options[ sdShop.potential_selection ]._class !== null )
				{
					let c = sdWorld.ClassNameToProperName( sdShop.options[ sdShop.potential_selection ]._class, sdShop.options[ sdShop.potential_selection ] );
					
					t = 'Click to select "' + c + '" as a build object. Then click to place this object in world.';
				}
				else
				if ( sdShop.options[ sdShop.potential_selection ].upgrade_name )
				t = 'Click to select "' + capitalize( sdShop.options[ sdShop.potential_selection ].upgrade_name.split('_').join(' ') ) + '" as an upgrade. Then click anywhere to upgrade.';
				
			}
			
			let d = ctx.measureText( t );
			
			let xx = sdWorld.mouse_screen_x + 16;
			
			if ( sdWorld.mouse_screen_x + 16 + d.width > sdRenderer.screen_width )
			xx = sdRenderer.screen_width - d.width - 16;
			
			ctx.fillStyle = '#000000';
			ctx.globalAlpha = 0.8;
			ctx.fillRect( xx, sdWorld.mouse_screen_y + 32, d.width + 10, 12 + 10 );
			ctx.globalAlpha = 1;
			
			ctx.fillStyle = '#ffffff';
			ctx.textAlign = 'left';
			ctx.fillText( t, xx + 5, sdWorld.mouse_screen_y + 32 + 12 + 5 );
		}

		
		sdWorld.my_entity._build_params = old_active_build_settings;
		sdShop.isDrawing = false;
	}
	static MouseDown( e )
	{
		if ( sdShop.open )
		{
			if ( !sdWorld.my_entity )
			{
				sdShop.open = false;
				return false;
			}
			
			let selected = true;
				
			if ( e.which === 1 )
			{
				//
				if ( sdShop.potential_selection === -1 )
				{
					sdWorld.my_entity._build_params = null;
				}
				else
				{
					if ( sdShop.options[ sdShop.potential_selection ]._opens_category )
					{
						sdShop.current_category = sdShop.options[ sdShop.potential_selection ]._opens_category;
						selected = false;
					}
					else
					sdWorld.my_entity._build_params = sdShop.options[ sdShop.potential_selection ];
				}
				
				if ( selected )
				globalThis.socket.emit( 'BUILD_SEL', sdShop.potential_selection );
			}
			
			if ( selected )
			{
				sdShop.open = false;
				//sdRenderer.UpdateCursor();
			}
			return true; // Block input
		}
		else
		{
			if ( e.which === 3 )
			if ( !sdContextMenu.open )
			if ( sdWorld.my_entity )
			if ( sdWorld.my_entity.hea > 0 )
			if ( sdWorld.my_entity._inventory[ sdWorld.my_entity.gun_slot ] )
			if ( sdGun.classes[ sdWorld.my_entity._inventory[ sdWorld.my_entity.gun_slot ].class ].is_build_gun )
			{
				sdShop.open = true;
				//sdRenderer.UpdateCursor();
				return true; // Block input
			}
		}
		return false; // Allow input
	}
	static MouseWheel( e )
	{
		//sdShop.scroll_y -= e.deltaY;
		sdShop.scroll_y_target -= e.deltaY;
	}
}
//sdShop.init_class();

export default sdShop;
