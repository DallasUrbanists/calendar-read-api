const axios = require('axios');
const cheerio = require('cheerio');

const trial = `<div id="our_actions" class="js-our_actions">
	<script>
		group_public_action_list_array = [];
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/housing-bills-at-the-texas-legislature"><img src="https://can2-prod.s3.amazonaws.com/events/photos/002/046/892/thumb/1.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/housing-bills-at-the-texas-legislature" class="listjs_name">Housing Bills at the Texas Legislature</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/february-social-hour-at-far-out-dallas"><img src="https://can2-prod.s3.amazonaws.com/events/photos/002/003/296/thumb/DN4H_Far_Out_Social_Hour_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/february-social-hour-at-far-out-dallas" class="listjs_name">February Social Hour at Far Out Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/advocate-for-parking-reform-at-cpc"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/982/677/thumb/CPC_Parking_Reform_Dec._5th_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/advocate-for-parking-reform-at-cpc" class="listjs_name">Advocate for Parking Reform at CPC</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/paved-paradise-dallas-parking-reform"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/977/193/thumb/Paved_Paradise_Event_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/paved-paradise-dallas-parking-reform" class="listjs_name">Paved Paradise - Dallas Parking Reform</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/october-celebrationsocial"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/960/039/thumb/DN4H_October_Social.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/october-celebrationsocial" class="listjs_name">October Celebration/Social</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/speak-up-for-forwarddallas-at-city-council"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/938/745/thumb/Speak_at_City_Council_August_28_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/speak-up-for-forwarddallas-at-city-council" class="listjs_name">Speak Up for ForwardDallas at City Council</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/letters/email-city-council-your-support-of-a-pro-housing-forward-dallas"><img src="https://can2-prod.s3.amazonaws.com/letters/photos/000/343/610/thumb/There&#x27;s_Room_for_Everyone_Forward_Dallas.jpeg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/letters/email-city-council-your-support-of-a-pro-housing-forward-dallas" class="listjs_name">Email City Council Your Support of a Pro-Housing Forward Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/dn4h-and-bfsd-joint-bike-ride"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/932/240/thumb/DN4H_and_BFSD_Flyer_.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/dn4h-and-bfsd-joint-bike-ride" class="listjs_name">DN4H and BFSD Joint Bike Ride</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/june-6th-summer-social-at-pegasus-city-brewery"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/910/722/thumb/DN4H_June_2024_Happy_Hour_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/june-6th-summer-social-at-pegasus-city-brewery" class="listjs_name">June 6th Summer Social at Pegasus City Brewery</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/lets-show-out-again-for-forward-dallas"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/832/604/thumb/open-uri20240426-3741650-10dm4mk" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/lets-show-out-again-for-forward-dallas" class="listjs_name">May 9th: Let&#x27;s Show Out Again for Forward Dallas! </a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/party-at-city-hall-april-18th-for-a-pro-housing-forward-dallas"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/819/706/thumb/Foward_Dallas_is_a_Win_for_Dallas.jpeg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/party-at-city-hall-april-18th-for-a-pro-housing-forward-dallas" class="listjs_name">Party at City Hall April 18th for a Pro-Housing Forward Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/march-virtual-event-forward-dallas-with-lawrence-agu"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/712/961/thumb/DN4H_March_24_Meeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/march-virtual-event-forward-dallas-with-lawrence-agu" class="listjs_name">March Virtual Event: Forward Dallas with Lawrence Agu</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/letters/email-city-plan-commission-to-support-a-pro-housing-forward-dallas"><img src="https://can2-prod.s3.amazonaws.com/letters/photos/000/320/900/thumb/Forward_Dallas_Cover_Feb_Draft_Screenshot.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/letters/email-city-plan-commission-to-support-a-pro-housing-forward-dallas" class="listjs_name">Email City Plan Commission to Support a Pro-Housing Forward Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/happy-hour-with-dallas-urbanists"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/527/265/thumb/March_1st_Happy_Hour_Screenshot.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/happy-hour-with-dallas-urbanists" class="listjs_name">Happy Hour with Dallas Urbanists</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/how-to-build-affordable-housing-february-dn4h-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/516/467/thumb/DN4H_February_Meeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/how-to-build-affordable-housing-february-dn4h-meeting" class="listjs_name">How to Build Affordable Housing: February DN4H Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/letters/support-missing-middle-housing-in-dallas"><img src="https://can2-prod.s3.amazonaws.com/letters/photos/000/304/361/thumb/Missing_Middle_Housing.jpeg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/letters/support-missing-middle-housing-in-dallas" class="listjs_name">Support Missing Middle Housing in Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/speak-up-for-housing-on-december-6th"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/482/015/thumb/Speak_at_City_Council_(1).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/speak-up-for-housing-on-december-6th" class="listjs_name">Speak Up for Housing on December 6th! </a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/october-social-hour"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/469/698/thumb/DNH_Meeting_Flyer_Template_(2).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/october-social-hour" class="listjs_name">October Social Hour</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/the-future-of-dallas-housing-august-24th-event"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/440/874/thumb/1.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/the-future-of-dallas-housing-august-24th-event" class="listjs_name">The Future of Dallas Housing: August 24th Event</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/community-bond-task-force-advocacy"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/440/864/thumb/open-uri20230807-660789-1hjz8q8" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/community-bond-task-force-advocacy" class="listjs_name">Community Bond Task Force Advocacy</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/advocate-for-transit-oriented-development-on-august-3rd-get-a-free-t-shirt"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/437/786/thumb/Speak_in_Favor_of_Housing_and_Get_a_Free_T-Shirt.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/advocate-for-transit-oriented-development-on-august-3rd-get-a-free-t-shirt" class="listjs_name">Advocate for Transit-Oriented Development on August 3rd... Get a Free T-Shirt!</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/dallas-rental-housing-assessment-july-virtual-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/432/236/thumb/July_Virtual_Meeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/dallas-rental-housing-assessment-july-virtual-meeting" class="listjs_name">Dallas Rental Housing Assessment: July Virtual Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/june-social-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/418/222/thumb/Urbanism_in_Dallas_June_29th_Event.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/june-social-meeting" class="listjs_name">Thursday June 29th Social Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/a-call-to-reinvest-in-south-dallas-and-the-i-345-vote"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/405/888/thumb/May_23rd_flier_.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/a-call-to-reinvest-in-south-dallas-and-the-i-345-vote" class="listjs_name">A Call to Reinvest in South Dallas and the I-345 Vote</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/support-our-endorsed-candidates-at-oak-cliff-brewing-company"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/392/938/thumb/DN4H_April_Meeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/support-our-endorsed-candidates-at-oak-cliff-brewing-company" class="listjs_name">Support Our Endorsed Candidates at Oak Cliff Brewing Company</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/letters/approve-affordable-housing-in-north-dallas"><img src="https://can2-prod.s3.amazonaws.com/letters/photos/000/262/860/thumb/Artists-rendering-of-Cypress-Creek-1.jpeg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/letters/approve-affordable-housing-in-north-dallas" class="listjs_name">Approve Affordable Housing in North Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/march-30th-endorsement-discussion-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/382/861/thumb/March_Meeting_Flyer.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/march-30th-endorsement-discussion-meeting" class="listjs_name">March 30th Endorsement Discussion Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/letters/dallas-city-council-prioritize-affordable-housing"><img src="https://can2-prod.s3.amazonaws.com/letters/photos/000/254/948/thumb/Dallas_Neighbors_For_Housing_Logo.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/letters/dallas-city-council-prioritize-affordable-housing" class="listjs_name">Dallas City Council, Prioritize Affordable Housing</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/january-24th-in-person-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/362/774/thumb/DN4H_January_Meeting_(3).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/january-24th-in-person-meeting" class="listjs_name">January 23rd In-Person Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/december-endorsements-process-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/354/234/thumb/DN4H_DecemberMeeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/december-endorsements-process-meeting" class="listjs_name">December Meeting Endorsements Process</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/november-10th-more-neighbors-dallas-meeting"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/342/373/thumb/MND_November_Meeting.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/november-10th-more-neighbors-dallas-meeting" class="listjs_name">November 10th More Neighbors Dallas Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/october-1st-social"><img src="/images/default_action.jpg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/october-1st-social" class="listjs_name">October 1st Social 2022</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/join-us-in-austin-for-txdots-statewide-meeting"><img src="/images/default_action.jpg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/join-us-in-austin-for-txdots-statewide-meeting" class="listjs_name">Join us in Austin for TxDOT&#x27;s Statewide Meeting</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/petitions/city-council-should-further-study-i345"><img src="https://can2-prod.s3.amazonaws.com/petitions/photos/000/378/657/thumb/Announcement_of_replace_345_(4).png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/petitions/city-council-should-further-study-i345" class="listjs_name">City Council Should do an Independent Study for I-345</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/paved-a-way-bookclub-with-author-collin-yarborough"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/193/278/thumb/MND_Bookclub_Flyer_9.1.2022.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/paved-a-way-bookclub-with-author-collin-yarborough" class="listjs_name">September 1st Paved a Way Bookclub with Author Collin Yarborough</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/june-virtual-meeting-with-professor-heather-way"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/174/834/thumb/HeatherWaymeetingpic.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/june-virtual-meeting-with-professor-heather-way" class="listjs_name">June Virtual Meeting with Professor Heather Way</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/speak-in-favor-of-one-dallas-options-at-city-council"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/161/453/thumb/New_Logo.jpeg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/speak-in-favor-of-one-dallas-options-at-city-council" class="listjs_name">Speak in favor of One Dallas Options at City Council</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/first-in-person-meeting-at-peoples-last-stand"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/148/810/thumb/N4MN_Slide_Template.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/first-in-person-meeting-at-peoples-last-stand" class="listjs_name">First In-Person Meeting at People&#x27;s Last Stand! </a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/events/first-virtual-meeting-for-n4mn-dallas-2"><img src="https://can2-prod.s3.amazonaws.com/events/photos/001/124/650/thumb/1.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/events/first-virtual-meeting-for-n4mn-dallas-2" class="listjs_name">First Virtual Meeting for N4MN - Dallas</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/forms/join-us-for-dallass-point-in-time-count"><img src="https://can2-prod.s3.amazonaws.com/forms/photos/000/504/669/thumb/signal-2022-02-06-143207_001.png" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/forms/join-us-for-dallass-point-in-time-count" class="listjs_name">Join us for the Dallas Point in Time Count</a></h6>' });
		group_public_action_list_array.push({ li_wrapper: '<a href="https://actionnetwork.org/forms/join-dallas-neighbors-for-housing"><img src="/images/default_action.jpg" class="our_single_image js-our_single_image" /></a><h6><a href="https://actionnetwork.org/forms/join-dallas-neighbors-for-housing" class="listjs_name">Follow Dallas Neighbors for Housing</a></h6>' });
	</script>
</div>`;

const EXTRACT_SAMPLE = `<div class="event_info view_event_info js-event_info">
  <div class="event_info_inner clearfi">
    <h4 class="event_date">
      <i class="far fa-calendar"></i>
      <span class="graytext mr5">Start:</span>
      <span class="js-event_datetime" title="Tuesday, March 18, 2025 &bull; 6:00 PM &bull; Central Daylight Time (US &amp; Canada) (GMT-05:00)">2025-03-18 18:00:00 UTC Central Daylight Time (US &amp; Canada) (GMT-05:00)</span>
    </h4>


    <h4 class="event_location">
      <i class="far fa-desktop"></i>
      A link to attend this virtual event will be emailed upon RSVP
    </h4>

    <h4 class="event_contact"><i class="far fa-comment"></i><span class="graytext">Host Contact Info: <span class="ml5"></span></span>moreneighborsdallas@gmail.com</h4>
    <div class="clear"></div>
  </div>
</div>`;


async function fetchURL(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' } // Prevents blocking by some websites
        });
        return data;
    } catch (error) {
        console.error(`Error fetching the webpage: ${error.message}`);
        return null;
    }
}

async function extractContent(url) {
    const html = await fetchURL(url);
    if (!html) return;

    const $ = cheerio.load(html);

    const actions = $('#our_actions script').html().split(/\r?\n/).filter(line=>line.includes('https://actionnetwork.org')).map(line => {
      const $ = cheerio.load(line.trim()
        .replace("group_public_action_list_array.push({ li_wrapper: '", "")
        .replace("' });", "")
      );
      return {
        link: $('a').attr('href'),
        img: $('img').attr('src'),
        title: $('a').text()
      };
    });

    console.log('Script:', actions);
}

async function extractEventDetails(url) {
  const $ = cheerio.load(EXTRACT_SAMPLE);
  const dateTimeElement = $('.event_info .event_date .js-event_datetime');
  const dateTimeValue = dateTimeElement.attr('title');
  const locationElement = $('.event_info .event_location');
  const locationValue = locationElement.text().trim();

  return {
    dateTime: dateTimeValue,
    location: locationValue
  };
}

const url = 'https://actionnetwork.org/groups/dallas-neighbors-for-housing'; // Replace with the URL you want to scrape



console.log(extractEventDetails(url));
