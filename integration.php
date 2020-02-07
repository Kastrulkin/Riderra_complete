<?php

die('Nothing to see');

array(
	'name[]'          => 'Alex',
	'phone[]'         => '+7 (909) 444-34-93',
	'comment'         => 'Нет комментария',
	'price'           => '10000',
	'from'            => 'проспект Ударников, 29, Санкт-Петербург, Россия',
	'to'              => 'улица Демьяна Бедного, 9, Санкт-Петербург, Россия',
	'day_start[]'     => 'Thu Nov 14 2019 16:34:03 GMT+0300',
	'date'            => '2019-11-12',
	'start_time_date' => '',
	'time'            => '17:45',
	'baggage'         => '1',
	'passangers'      => '3',
	'pets'            => '0',
	'kid_seats_3_6'   => '0',
	'kid_seats_6_12'  => '1',
	'return_route'    => 'on',
	'race'            => '',
);


$data = array(
	'CoId'            => 'C0E1E4CC-4140-46CA-B761-4942AFBB90D0',
	'CustomerId'      => '78DFEF2D-537C-4E7A-BBCD-0F11FAB5ABD8',
	'BookingRef'      => 'RIDERRA_REFERENCE_HERE',
	'journey'         => 1,
	'pHours'          => 0,
	'pService'        => 'SEDAN',
	'VehicleAgeLimit' => 1,
	'pDate'           => '2019-10-25 06:04:00',
	'pPremise'        => 'Boston Public Market, Hanover Street, Boston, MA, USA',
	'pStreetNo'       => '100',
	'pStreet'         => 'Hanover Street',
	'pTown'           => 'Boston',
	'pCounty'         => 'Suffolk County',
	'pPostcode'       => '02108',
	'pCountry'        => 'USA',
	'pIATA'           => 'JFK',
	'pFlightNumber'   => 'AA848',
	'pAddressNote'    => 'pickup address instruction',
	'pLat'            => '42.3622119',
	'pLong'           => '-71.0575348',
	'dPremise'        => 'Boston Public Market, Hanover Street, Boston, MA, USA',
	'dStreetNo'       => '100',
	'dStreet'         => 'Hanover Street',
	'dTown'           => 'Boston',
	'dCounty'         => 'Suffolk County',
	'dPostcode'       => '02108',
	'dCountry'        => 'US',
	'dIATA'           => '',
	'dFlightNumber'   => '',
	'dAddressNote'    => 'destination address instruction',
	'dLat'            => '42.3622119',
	'dLong'           => '-71.0575348',
	'Passengers'      => array(
		0 => array(
			'pName'   => 'Test',
			'pPrefix' => '1',
			'pPhone'  => '9564878453',
			'pEmail'  => 'test@gmail.com',
		),
	),
	'NoOfCases'       => '1',
	'pNotes'          => 'Booking instruction',
	'pPrice'          => '55.80',
	'pTime'           => '25',
	'pPassenger'      => '3',
);


$curlOptions = array(
	CURLOPT_RETURNTRANSFER => true,
	CURLOPT_HEADER         => false,
	CURLOPT_SSL_VERIFYPEER => false,
	CURLOPT_SSL_VERIFYHOST => false,
	CURLOPT_FOLLOWLOCATION => true,
	CURLOPT_URL            => 'http://api-ivcardobooking.azurewebsites.net:80/api/Booking/BookNow',
	CURLOPT_POSTFIELDS     => json_encode( $data ),
	CURLOPT_CUSTOMREQUEST  => 'POST',
	CURLOPT_HTTPHEADER     => array(
		'Content-Type: application/json ; charset=UTF-8',
		"ClientId: C0E1E4CC-4140-46CA-B761-4942AFBB90D0",
		"ClientSecret: 1584"
	)
);

$curl = curl_init();
curl_setopt_array( $curl, $curlOptions );
$out = curl_exec( $curl );
curl_close( $curl );

print_r( $out );